"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";
import { createClient } from "@/lib/supabase/server";
import { LEAGUE_IDS } from "@/lib/data/leagues";
import { TEAM_IDS, TEAMS, type Team } from "@/lib/data/teams";
import { getTeam, searchTeams } from "@/lib/football/client";
import { feedTagFor } from "@/lib/feed/cache-key";
import type { TeamSuggestion } from "./types";

const STYLE_VALUES = ["casual", "analytical", "balanced"] as const;

const updateProfileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Nome muito curto.")
    .max(50, "Nome muito longo.")
    .optional(),
  favoriteTeamId: z
    .number()
    .int()
    .positive("Time inválido.")
    .optional()
    .nullable(),
  followedLeagues: z
    .array(z.string())
    .min(1, "Escolha ao menos uma liga.")
    .refine(
      (ids) => ids.every((id) => LEAGUE_IDS.has(id)),
      "Liga não suportada."
    )
    .optional(),
  watchedTeams: z
    .array(z.number().int().positive())
    .max(10, "Máximo 10 times no radar.")
    .optional(),
  watchedPlayers: z
    .array(
      z
        .string()
        .trim()
        .min(2, "Nome de jogador muito curto.")
        .max(40, "Nome de jogador muito longo.")
    )
    .max(10, "Máximo 10 jogadores no radar.")
    .optional(),
  style: z.enum(STYLE_VALUES).optional(),
});


async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Aceita um teamId se ele estiver na lista curada OU se a Football-Data
 * resolver o id (com cache de 24h, evitando custo recorrente). Retorna `false`
 * quando nada confirma a existência do time.
 */
async function isTeamIdValid(teamId: number): Promise<boolean> {
  if (TEAM_IDS.has(teamId)) return true;
  const result = await getTeam(teamId);
  return result.ok;
}

export async function updateProfileAction(
  rawInput: unknown
): Promise<Result<void>> {
  const parsed = updateProfileSchema.safeParse(rawInput);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");

  const input = parsed.data;

  if (
    input.favoriteTeamId !== undefined &&
    input.favoriteTeamId !== null &&
    !(await isTeamIdValid(input.favoriteTeamId))
  ) {
    return err("Esse time não existe na nossa base. Tenta outro.");
  }

  if (input.watchedTeams && input.watchedTeams.length > 0) {
    const checks = await Promise.all(
      input.watchedTeams.map((id) => isTeamIdValid(id))
    );
    if (checks.some((valid) => !valid)) {
      return err("Algum time do radar não foi encontrado. Tira ele e tenta de novo.");
    }
  }

  try {
    await prisma.profile.update({
      where: { id: userId },
      data: {
        ...(input.displayName !== undefined
          ? { displayName: input.displayName }
          : {}),
        ...(input.favoriteTeamId !== undefined
          ? { favoriteTeamId: input.favoriteTeamId }
          : {}),
        ...(input.followedLeagues !== undefined
          ? { followedLeagues: input.followedLeagues }
          : {}),
        ...(input.watchedTeams !== undefined
          ? { watchedTeams: input.watchedTeams }
          : {}),
        ...(input.watchedPlayers !== undefined
          ? { watchedPlayers: input.watchedPlayers }
          : {}),
        ...(input.style !== undefined ? { style: input.style } : {}),
      },
    });
  } catch (error) {
    logger.error("settings.update_profile_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return err("Não consegui salvar agora. Tenta de novo em uns minutinhos.");
  }

  revalidateTag(feedTagFor(userId));
  revalidatePath("/");
  revalidatePath("/settings");
  return ok(undefined);
}

/**
 * Limpa as preferências de onboarding (time, ligas, radar) e a marca de
 * conclusão. Em seguida força o usuário a refazer o fluxo de onboarding.
 */
export async function resetOnboardingAction(): Promise<Result<void>> {
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");

  try {
    await prisma.profile.update({
      where: { id: userId },
      data: {
        favoriteTeamId: null,
        followedLeagues: [],
        watchedTeams: [],
        watchedPlayers: [],
        onboardingCompletedAt: null,
      },
    });
  } catch (error) {
    logger.error("settings.reset_onboarding_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return err("Não consegui resetar agora. Tenta de novo.");
  }

  revalidateTag(feedTagFor(userId));
  revalidatePath("/");
  redirect("/onboarding/time");
}

/**
 * Stub. Apagar conta exige `supabase.auth.admin.deleteUser` (precisa do
 * service role) + remoção do profile. Implementar quando entrarmos no
 * milestone de testes/refinamento.
 */
// TODO milestone futuro: deletar via supabase.auth.admin
export async function deleteAccountAction(): Promise<Result<void>> {
  return err("Disponível em breve.");
}

const SEARCH_LIMIT = 8;

function suggestionFromCurated(team: Team): TeamSuggestion {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    leagueCode: team.leagueCode,
    source: "curated",
  };
}

/**
 * Busca times pra UI de configurações: primeiro varre a lista curada
 * (rápido, em memória) e, se faltar variedade, complementa com a Football-Data
 * (`/teams?name=`, cache 24h). Falha de API degrada graciosamente.
 */
export async function searchTeamAction(
  query: string
): Promise<Result<TeamSuggestion[]>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return ok([]);

  const norm = trimmed.toLowerCase();
  const curated = TEAMS.filter(
    (team) =>
      team.name.toLowerCase().includes(norm) ||
      team.shortName.toLowerCase().includes(norm)
  )
    .slice(0, SEARCH_LIMIT)
    .map(suggestionFromCurated);

  if (curated.length >= 5) return ok(curated);

  const apiResult = await searchTeams(trimmed);
  if (!apiResult.ok) return ok(curated);

  const seen = new Set(curated.map((c) => c.id));
  const fromApi: TeamSuggestion[] = apiResult.data.teams
    .filter((team) => !seen.has(team.id))
    .slice(0, SEARCH_LIMIT - curated.length)
    .map((team) => ({
      id: team.id,
      name: team.name,
      shortName: team.shortName ?? team.name,
      crest: team.crest,
      source: "api" as const,
    }));

  return ok([...curated, ...fromApi]);
}
