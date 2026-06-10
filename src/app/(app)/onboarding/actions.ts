"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";
import { LEAGUE_IDS } from "@/lib/data/leagues";
import { TEAM_IDS, getTeamById } from "@/lib/data/teams";
import { createClient } from "@/lib/supabase/server";

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const setFavoriteTeamSchema = z.object({
  teamId: z
    .number()
    .int()
    .refine((id) => TEAM_IDS.has(id), "Time não está na lista suportada."),
});

export async function setFavoriteTeamAction(
  teamId: number
): Promise<Result<void>> {
  const parsed = setFavoriteTeamSchema.safeParse({ teamId });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Time inválido.");
  }
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");

  try {
    await prisma.profile.update({
      where: { id: userId },
      data: { favoriteTeamId: parsed.data.teamId },
    });
    revalidatePath("/onboarding/ligas");
    return ok(undefined);
  } catch (error) {
    logger.error("setFavoriteTeamAction failed", { error });
    return err("Não consegui salvar o time. Tenta de novo.");
  }
}

const completeOnboardingSchema = z.object({
  leagueIds: z
    .array(z.string())
    .min(1, "Escolha ao menos uma liga.")
    .refine(
      (ids) => ids.every((id) => LEAGUE_IDS.has(id)),
      "Liga não suportada."
    ),
});

export async function completeOnboardingAction(
  leagueIds: string[]
): Promise<Result<void>> {
  const parsed = completeOnboardingSchema.safeParse({ leagueIds });
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Seleção inválida.");
  }
  const userId = await requireUserId();
  if (!userId) return err("Sessão expirada. Faça login novamente.");

  try {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile?.favoriteTeamId) {
      return err("Escolha o time do coração antes das ligas.");
    }
    if (!getTeamById(profile.favoriteTeamId)) {
      return err("Time inválido. Volte e escolha de novo.");
    }
    await prisma.profile.update({
      where: { id: userId },
      data: {
        followedLeagues: parsed.data.leagueIds,
        onboardingCompletedAt: new Date(),
      },
    });
    revalidatePath("/");
    return ok(undefined);
  } catch (error) {
    logger.error("completeOnboardingAction failed", { error });
    return err("Não consegui concluir o onboarding. Tenta de novo.");
  }
}
