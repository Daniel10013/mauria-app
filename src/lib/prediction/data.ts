import "server-only";
import { logger } from "@/lib/logger";
import {
  getTeamRecentMatches,
  getTeamUpcomingMatches,
} from "@/lib/football/client";
import type { ResolvedTeam } from "@/lib/football/resolver";
import type { FdMatch } from "@/lib/football/types";

export type HomeAdvantage = "A" | "B" | "neutral";

export interface PredictionInput {
  teamA: ResolvedTeam;
  teamB: ResolvedTeam;
  recentA: FdMatch[];
  recentB: FdMatch[];
  headToHead: FdMatch[];
  homeAdvantage: HomeAdvantage;
  /** Próximo confronto agendado entre A e B (se identificado). */
  scheduledMatch: FdMatch | null;
}

const RECENT_LIMIT = 10;

/**
 * Reúne os dados necessários para o cálculo de previsão entre dois times.
 *
 * - Pega os últimos 10 jogos finalizados de cada time (com cache).
 * - Cruza pra extrair head-to-head (jogos onde os dois apareceram).
 * - Tenta inferir o mando: se houver um `scheduledMatch` ou se um próximo
 *   jogo entre A e B for encontrado nos próximos jogos do A.
 * - Se nada disso resolver, devolve `homeAdvantage: 'neutral'`.
 */
export async function gatherPredictionData(
  teamA: ResolvedTeam,
  teamB: ResolvedTeam,
  scheduledMatchHint?: FdMatch
): Promise<PredictionInput> {
  const [recentAResult, recentBResult] = await Promise.all([
    getTeamRecentMatches(teamA.id, RECENT_LIMIT),
    getTeamRecentMatches(teamB.id, RECENT_LIMIT),
  ]);
  const recentA = recentAResult.ok ? recentAResult.data.matches : [];
  const recentB = recentBResult.ok ? recentBResult.data.matches : [];

  const recentBIds = new Set(recentB.map((m) => m.id));
  const headToHead = recentA.filter((match) => recentBIds.has(match.id));

  let scheduledMatch: FdMatch | null = scheduledMatchHint ?? null;
  if (!scheduledMatch) {
    const upcoming = await getTeamUpcomingMatches(teamA.id, 20);
    if (upcoming.ok) {
      scheduledMatch =
        upcoming.data.matches.find(
          (m) => m.homeTeam.id === teamB.id || m.awayTeam.id === teamB.id
        ) ?? null;
    }
  }

  let homeAdvantage: HomeAdvantage = "neutral";
  if (scheduledMatch) {
    if (scheduledMatch.homeTeam.id === teamA.id) homeAdvantage = "A";
    else if (scheduledMatch.homeTeam.id === teamB.id) homeAdvantage = "B";
  }

  logger.info("prediction.gather", {
    teamA: teamA.id,
    teamB: teamB.id,
    recentA: recentA.length,
    recentB: recentB.length,
    h2h: headToHead.length,
    homeAdvantage,
  });

  return {
    teamA,
    teamB,
    recentA,
    recentB,
    headToHead,
    homeAdvantage,
    scheduledMatch,
  };
}
