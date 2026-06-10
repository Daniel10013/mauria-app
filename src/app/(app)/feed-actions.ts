"use server";

import { revalidateTag } from "next/cache";
import { err, ok, type Result } from "@/lib/result";
import { getCurrentProfile } from "@/lib/auth/profile";
import { feedTagFor } from "@/lib/feed/cache-key";
import { getHeadToHead } from "@/lib/football/client";
import type {
  H2HSummary,
  H2HSummaryMatch,
} from "@/lib/feed/h2h-types";

/**
 * Invalida o cache do feed do usuário atual. A home recarrega na próxima
 * navegação ou no `router.refresh()` do cliente.
 */
export async function refreshFeedAction(): Promise<Result<void>> {
  const profile = await getCurrentProfile();
  if (!profile) return err("Sessão expirada. Faça login novamente.");
  revalidateTag(feedTagFor(profile.id));
  return ok(undefined);
}

/**
 * Carrega o histórico de confronto direto pra o popover "Mais detalhes" do
 * MatchCard. Trata 403 (free tier sem cobertura) como `available = false`,
 * sem propagar erro pro cliente. Cache 24h vem de `getHeadToHead`.
 */
export async function fetchHeadToHeadAction(
  matchId: number
): Promise<Result<H2HSummary>> {
  if (!Number.isInteger(matchId) || matchId <= 0) {
    return err("Match inválido.");
  }
  const profile = await getCurrentProfile();
  if (!profile) return err("Sessão expirada. Faça login novamente.");

  const result = await getHeadToHead(matchId, 5);
  if (!result.ok) {
    if (result.error === "forbidden" || result.error === "not_found") {
      return ok({ matches: [], available: false });
    }
    return err("Não consegui buscar o histórico agora. Tenta de novo.");
  }

  const matches: H2HSummaryMatch[] = result.data.matches
    .slice(0, 5)
    .map((m) => ({
      id: m.id,
      utcDate: m.utcDate,
      competitionName: m.competition.name,
      homeName: m.homeTeam.shortName ?? m.homeTeam.name,
      awayName: m.awayTeam.shortName ?? m.awayTeam.name,
      homeScore: m.score.fullTime.home,
      awayScore: m.score.fullTime.away,
    }));

  return ok({ matches, available: true });
}
