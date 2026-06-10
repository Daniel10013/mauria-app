import type { FdMatch } from "@/lib/football/types";
import type { PredictionInput, HomeAdvantage } from "./data";

export interface PredictionFactors {
  formA: number;
  formB: number;
  h2hAdvantage: "A" | "B" | "neutral";
  h2hScore: { winsA: number; draws: number; winsB: number };
  homeAdvantage: HomeAdvantage;
  goalDiffA: number;
  goalDiffB: number;
}

export interface PredictionResult {
  /** Probabilidades de cada resultado (do ponto de vista do mandante). Soma 1.0. */
  probabilities: { home: number; draw: number; away: number };
  /** Quem é o mandante e quem é o visitante na visão do card. */
  mapping: { home: "A" | "B"; away: "A" | "B" };
  factors: PredictionFactors;
  /** Texto pronto pra LLM injetar como contexto. */
  narrativeContext: string;
}

// Constantes do modelo. Tudo declarado em lugar visível para que o algoritmo
// possa ser auditado/explicado academicamente. Ajustes finos vão aqui.
const BASE = { home: 0.45, draw: 0.27, away: 0.28 } as const;
const WEIGHT_FORM = 0.18;
const WEIGHT_H2H = 0.1;
const WEIGHT_HOME = 0.06;
const WEIGHT_GOAL_DIFF = 0.06;
const PROB_FLOOR = 0.05;
const PROB_CEIL = 0.8;

/**
 * Calcula a previsão entre dois times a partir do `PredictionInput` montado
 * pelo `gatherPredictionData`. Função pura — não faz I/O, fácil de testar.
 *
 * Convenção do output:
 * - `mapping.home` = qual dos times A/B é o mandante na visão do card.
 *   Se `homeAdvantage === 'A'` → A é mandante.
 *   Se `'B'` → B é mandante.
 *   Se `'neutral'` → A é tratado como "mandante" pra ter um mapeamento
 *   estável; o card mostra um badge "Casa" só quando há vantagem real.
 * - `probabilities.home` é a probabilidade do mandante vencer; `away` do
 *   visitante; `draw` de empate. Sempre normalizadas (somam 1.0).
 */
export function calculatePrediction(input: PredictionInput): PredictionResult {
  const last5A = input.recentA.slice(0, 5);
  const last5B = input.recentB.slice(0, 5);

  // 1. Forma recente: pontos nos últimos 5 jogos / 15.
  const formA = computeForm(last5A, input.teamA.id);
  const formB = computeForm(last5B, input.teamB.id);

  // 2. Saldo de gols ponderado (gols pró - contra) dos últimos 5 jogos.
  const goalDiffA = computeGoalDiff(last5A, input.teamA.id);
  const goalDiffB = computeGoalDiff(last5B, input.teamB.id);

  // 3. H2H: vitórias de cada lado nos jogos diretos coletados.
  const h2hScore = computeH2HScore(input.headToHead, input.teamA.id, input.teamB.id);
  const h2hAdvantage: PredictionFactors["h2hAdvantage"] =
    h2hScore.winsA > h2hScore.winsB
      ? "A"
      : h2hScore.winsB > h2hScore.winsA
        ? "B"
        : "neutral";

  // 4. Mapeamento home/away.
  const mappingHome: "A" | "B" =
    input.homeAdvantage === "B" ? "B" : "A";
  const mappingAway: "A" | "B" = mappingHome === "A" ? "B" : "A";

  // Probabilidades iniciais (do mandante). Tipos explícitos para que os
  // ajustes posteriores (Math.max, multiplicações) não conflitem com o
  // tipo literal inferido do `BASE` (`as const`).
  let pHome: number = BASE.home;
  let pDraw: number = BASE.draw;
  let pAway: number = BASE.away;

  // ---- Aplicação de fatores. ----
  // Cada fator move % entre as colunas. Fator positivo → favorece o mandante.

  // Forma: diferença entre formA e formB. Quem está em melhor forma puxa
  // probabilidade do seu lado.
  const formDiff =
    mappingHome === "A" ? formA - formB : formB - formA; // [-1, 1]
  pHome += formDiff * WEIGHT_FORM;
  pAway -= formDiff * WEIGHT_FORM;

  // H2H: se mandante venceu mais nos confrontos diretos, vantagem.
  if (h2hAdvantage !== "neutral") {
    const sign = h2hAdvantage === mappingHome ? 1 : -1;
    pHome += sign * WEIGHT_H2H;
    pAway -= sign * WEIGHT_H2H;
  }

  // Mando: bônus fixo se o mando foi inferido (não-neutral).
  if (input.homeAdvantage !== "neutral") {
    pHome += WEIGHT_HOME;
    // Empate se beneficia ligeiramente também — fato observado em ligas top.
    pDraw += WEIGHT_HOME * 0.3;
    pAway -= WEIGHT_HOME * 1.3;
  }

  // Saldo de gols: time mais "ofensivo nos números" puxa probabilidade.
  const goalNorm = (gd: number) => Math.max(-1, Math.min(1, gd / 8));
  const goalDiff =
    mappingHome === "A"
      ? goalNorm(goalDiffA) - goalNorm(goalDiffB)
      : goalNorm(goalDiffB) - goalNorm(goalDiffA);
  pHome += goalDiff * WEIGHT_GOAL_DIFF;
  pAway -= goalDiff * WEIGHT_GOAL_DIFF;

  // ---- Normalização e clamping. ----

  // Garantir não-negativos antes de normalizar.
  pHome = Math.max(0.001, pHome);
  pDraw = Math.max(0.001, pDraw);
  pAway = Math.max(0.001, pAway);

  let total = pHome + pDraw + pAway;
  pHome = pHome / total;
  pDraw = pDraw / total;
  pAway = pAway / total;

  // Capar entre [PROB_FLOOR, PROB_CEIL] e re-normalizar.
  pHome = Math.max(PROB_FLOOR, Math.min(PROB_CEIL, pHome));
  pDraw = Math.max(PROB_FLOOR, Math.min(PROB_CEIL, pDraw));
  pAway = Math.max(PROB_FLOOR, Math.min(PROB_CEIL, pAway));
  total = pHome + pDraw + pAway;
  pHome /= total;
  pDraw /= total;
  pAway /= total;

  const factors: PredictionFactors = {
    formA,
    formB,
    h2hAdvantage,
    h2hScore,
    homeAdvantage: input.homeAdvantage,
    goalDiffA,
    goalDiffB,
  };

  return {
    probabilities: { home: pHome, draw: pDraw, away: pAway },
    mapping: { home: mappingHome, away: mappingAway },
    factors,
    narrativeContext: buildNarrativeContext(input, factors, {
      home: pHome,
      draw: pDraw,
      away: pAway,
    }, mappingHome),
  };
}

function computeForm(matches: FdMatch[], teamId: number): number {
  if (matches.length === 0) return 0.5;
  let pts = 0;
  for (const match of matches) {
    const isHome = match.homeTeam.id === teamId;
    const fullTime = match.score.fullTime;
    if (fullTime.home === null || fullTime.away === null) continue;
    if (fullTime.home === fullTime.away) pts += 1;
    else if (isHome && fullTime.home > fullTime.away) pts += 3;
    else if (!isHome && fullTime.away > fullTime.home) pts += 3;
  }
  const max = matches.length * 3;
  return max === 0 ? 0.5 : pts / max;
}

function computeGoalDiff(matches: FdMatch[], teamId: number): number {
  let diff = 0;
  for (const match of matches) {
    const isHome = match.homeTeam.id === teamId;
    const fullTime = match.score.fullTime;
    if (fullTime.home === null || fullTime.away === null) continue;
    if (isHome) diff += fullTime.home - fullTime.away;
    else diff += fullTime.away - fullTime.home;
  }
  return diff;
}

function computeH2HScore(
  matches: FdMatch[],
  teamAId: number,
  teamBId: number
): { winsA: number; draws: number; winsB: number } {
  let winsA = 0;
  let draws = 0;
  let winsB = 0;
  for (const match of matches) {
    const fullTime = match.score.fullTime;
    if (fullTime.home === null || fullTime.away === null) continue;
    if (fullTime.home === fullTime.away) {
      draws += 1;
      continue;
    }
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;
    const homeWon = fullTime.home > fullTime.away;
    if (homeWon) {
      if (homeId === teamAId) winsA += 1;
      else if (homeId === teamBId) winsB += 1;
    } else {
      if (awayId === teamAId) winsA += 1;
      else if (awayId === teamBId) winsB += 1;
    }
  }
  return { winsA, draws, winsB };
}

function recordSummary(matches: FdMatch[], teamId: number): string {
  let v = 0;
  let e = 0;
  let d = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  for (const match of matches) {
    const ft = match.score.fullTime;
    if (ft.home === null || ft.away === null) continue;
    const isHome = match.homeTeam.id === teamId;
    const own = isHome ? ft.home : ft.away;
    const opp = isHome ? ft.away : ft.home;
    goalsFor += own;
    goalsAgainst += opp;
    if (own === opp) e += 1;
    else if (own > opp) v += 1;
    else d += 1;
  }
  return `${v} vitória${v === 1 ? "" : "s"}, ${e} empate${e === 1 ? "" : "s"}, ${d} derrota${
    d === 1 ? "" : "s"
  }; ${goalsFor} gols pró × ${goalsAgainst} contra`;
}

function buildNarrativeContext(
  input: PredictionInput,
  factors: PredictionFactors,
  probabilities: { home: number; draw: number; away: number },
  mappingHome: "A" | "B"
): string {
  const home = mappingHome === "A" ? input.teamA : input.teamB;
  const away = mappingHome === "A" ? input.teamB : input.teamA;
  const homeRecent = mappingHome === "A" ? input.recentA : input.recentB;
  const awayRecent = mappingHome === "A" ? input.recentB : input.recentA;
  const mandanteLabel =
    input.homeAdvantage === "neutral" ? "campo neutro" : "casa";

  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const h2hLine =
    factors.h2hScore.winsA + factors.h2hScore.draws + factors.h2hScore.winsB > 0
      ? `H2H (encontros recentes): ${input.teamA.shortName} ${factors.h2hScore.winsA}V, empates ${factors.h2hScore.draws}, ${input.teamB.shortName} ${factors.h2hScore.winsB}V.`
      : `H2H: sem confrontos recentes nos dados disponíveis.`;

  return [
    `=== DADOS DA PREVISÃO ===`,
    `${home.name} (${input.homeAdvantage === "neutral" ? "campo neutro" : "mandante"}): ${recordSummary(
      homeRecent,
      home.id
    )}.`,
    `${away.name} (visitante): ${recordSummary(awayRecent, away.id)}.`,
    h2hLine,
    `Mando: ${
      input.homeAdvantage === "neutral"
        ? "não identificado (tratado como neutro)"
        : `${home.name} joga em ${mandanteLabel}`
    }.`,
    `Probabilidades calculadas: ${home.shortName} ${pct(probabilities.home)}, Empate ${pct(
      probabilities.draw
    )}, ${away.shortName} ${pct(probabilities.away)}.`,
    `=== FIM DOS DADOS ===`,
  ].join("\n");
}
