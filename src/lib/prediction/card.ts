import type { PredictionInput } from "./data";
import type { PredictionResult } from "./calculator";

/**
 * Estrutura serializável (JSON) do card de previsão. Usada tanto pelo frame
 * SSE `prediction` quanto pelo `metadata.predictionCard` da mensagem do
 * assistant. Mantida estável: mudanças aqui afetam mensagens persistidas.
 */
export interface PredictionCardData {
  generatedAt: string;
  home: { id: number; name: string; shortName: string; crest?: string };
  away: { id: number; name: string; shortName: string; crest?: string };
  /** Quando 'neutral', o card oculta o badge "Casa". */
  homeAdvantage: "A" | "B" | "neutral";
  probabilities: { home: number; draw: number; away: number };
  factors: {
    formHomePct: number;
    formAwayPct: number;
    h2h: { winsHome: number; draws: number; winsAway: number };
    goalDiffHome: number;
    goalDiffAway: number;
  };
  /** Resumo curto para fallback de leitores sem suporte ao card visual. */
  textSummary: string;
}

export function buildPredictionCard(
  input: PredictionInput,
  result: PredictionResult
): PredictionCardData {
  const home = result.mapping.home === "A" ? input.teamA : input.teamB;
  const away = result.mapping.home === "A" ? input.teamB : input.teamA;

  const formHomePct =
    result.mapping.home === "A" ? result.factors.formA : result.factors.formB;
  const formAwayPct =
    result.mapping.home === "A" ? result.factors.formB : result.factors.formA;
  const goalDiffHome =
    result.mapping.home === "A"
      ? result.factors.goalDiffA
      : result.factors.goalDiffB;
  const goalDiffAway =
    result.mapping.home === "A"
      ? result.factors.goalDiffB
      : result.factors.goalDiffA;

  const winsHome =
    result.mapping.home === "A"
      ? result.factors.h2hScore.winsA
      : result.factors.h2hScore.winsB;
  const winsAway =
    result.mapping.home === "A"
      ? result.factors.h2hScore.winsB
      : result.factors.h2hScore.winsA;

  return {
    generatedAt: new Date().toISOString(),
    home: { id: home.id, name: home.name, shortName: home.shortName },
    away: { id: away.id, name: away.name, shortName: away.shortName },
    homeAdvantage: input.homeAdvantage,
    probabilities: result.probabilities,
    factors: {
      formHomePct,
      formAwayPct,
      h2h: {
        winsHome,
        draws: result.factors.h2hScore.draws,
        winsAway,
      },
      goalDiffHome,
      goalDiffAway,
    },
    textSummary: `${home.shortName} ${Math.round(result.probabilities.home * 100)}% · Empate ${Math.round(
      result.probabilities.draw * 100
    )}% · ${away.shortName} ${Math.round(result.probabilities.away * 100)}%`,
  };
}
