import "server-only";
import { cache } from "react";
import type { Profile } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  resolveTeamById,
  type ResolvedTeam,
} from "@/lib/football/resolver";

/**
 * Busca o profile do usuário; cria com defaults se ainda não existir.
 * O id do profile é igual ao id do usuário no Supabase Auth (auth.users.id).
 */
export async function getOrCreateProfile(
  userId: string,
  email: string
): Promise<Profile> {
  const existing = await prisma.profile.findUnique({ where: { id: userId } });
  if (existing) return existing;

  return prisma.profile.create({
    data: {
      id: userId,
      email,
      displayName: null,
      favoriteTeamId: null,
      followedLeagues: [],
      onboardingCompletedAt: null,
    },
  });
}

/**
 * Onboarding está completo quando o usuário escolheu time, ao menos uma liga,
 * e a data de conclusão foi marcada.
 */
export function isOnboardingComplete(profile: Profile): boolean {
  return (
    profile.onboardingCompletedAt !== null &&
    profile.favoriteTeamId !== null &&
    profile.followedLeagues.length > 0
  );
}

/**
 * Server-only: pega o usuário da sessão atual e retorna o profile (criando
 * se necessário). Devolve `null` se não houver sessão.
 *
 * Memoizado por request com React `cache()`: layout e página chamam isto na
 * mesma renderização — sem o cache eram 2+ idas ao Supabase/Postgres por
 * navegação.
 */
export const getCurrentProfile = cache(
  async (): Promise<Profile | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) return null;
    return getOrCreateProfile(user.id, user.email);
  }
);

/** Profile + time favorito já resolvido (com crest se a API responder). */
export interface ResolvedProfile extends Profile {
  favoriteTeam: ResolvedTeam | null;
}

/**
 * Versão usada pelo feed e pelo system prompt: além do profile, devolve
 * `favoriteTeam` resolvido pela Football-Data (com crest). Falha de API não
 * propaga — `favoriteTeam` cai pra null.
 */
export async function getCurrentProfileResolved(): Promise<ResolvedProfile | null> {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  let favoriteTeam: ResolvedTeam | null = null;
  if (profile.favoriteTeamId !== null) {
    favoriteTeam = await resolveTeamById(profile.favoriteTeamId);
  }
  return { ...profile, favoriteTeam };
}
