import type {
  FdMatch,
  FdStandingsRow,
} from "@/lib/football/types";
import type { ResolvedTeam } from "@/lib/football/resolver";

export type InsightSource = "data" | "llm";

export interface Insight {
  id: string;
  icon: string;
  title: string;
  detail: string;
  source: InsightSource;
}

/**
 * Hash determinístico curto pra `Insight.id`. Mesmo conteúdo no mesmo dia →
 * mesmo id (evita duplicação visual quando o feed re-renderiza).
 */
function makeId(parts: string[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const raw = `${today}|${parts.join("|")}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `i_${(hash >>> 0).toString(36)}`;
}

/** Resultado de um jogo do ponto de vista do `teamId`. Retorna null se incompleto. */
function resultFor(match: FdMatch, teamId: number): "W" | "D" | "L" | null {
  const ft = match.score.fullTime;
  if (ft.home === null || ft.away === null) return null;
  const isHome = match.homeTeam.id === teamId;
  if (ft.home === ft.away) return "D";
  if (isHome) return ft.home > ft.away ? "W" : "L";
  return ft.away > ft.home ? "W" : "L";
}

/** Sequência atual de vitórias (W) ou de invencibilidade (W+D) — qualquer que seja a mais longa. */
export function streakInsight(
  team: ResolvedTeam,
  recent: FdMatch[]
): Insight | null {
  if (recent.length < 3) return null;
  const ordered = [...recent].sort(
    (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
  );
  let wins = 0;
  for (const match of ordered) {
    const r = resultFor(match, team.id);
    if (r === "W") wins += 1;
    else break;
  }
  if (wins < 3) return null;
  return {
    id: makeId(["streak", String(team.id), String(wins)]),
    icon: "🔥",
    title: `${team.shortName} venceu os últimos ${wins} jogos`,
    detail: `Sequência atual de ${wins} vitórias seguidas em todas as competições.`,
    source: "data",
  };
}

/** Invencibilidade: sequência sem derrota (W+D) a partir do jogo mais recente. */
export function unbeatenInsight(
  team: ResolvedTeam,
  recent: FdMatch[]
): Insight | null {
  if (recent.length < 4) return null;
  const ordered = [...recent].sort(
    (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
  );
  let unbeaten = 0;
  for (const match of ordered) {
    const r = resultFor(match, team.id);
    if (r === "W" || r === "D") unbeaten += 1;
    else break;
  }
  if (unbeaten < 4) return null;
  return {
    id: makeId(["unbeaten", String(team.id), String(unbeaten)]),
    icon: "🛡️",
    title: `${team.shortName} invicto há ${unbeaten} jogos`,
    detail: `Sem perder há ${unbeaten} partidas considerando os últimos jogos.`,
    source: "data",
  };
}

/** Time vem marcando muito (3+ gols) na maioria dos últimos jogos. */
export function goalsInsight(
  team: ResolvedTeam,
  recent: FdMatch[]
): Insight | null {
  if (recent.length < 5) return null;
  const last6 = [...recent]
    .sort(
      (a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
    )
    .slice(0, 6);
  let totalScored = 0;
  let scoredThreePlus = 0;
  for (const match of last6) {
    const ft = match.score.fullTime;
    if (ft.home === null || ft.away === null) continue;
    const isHome = match.homeTeam.id === team.id;
    const own = isHome ? ft.home : ft.away;
    totalScored += own;
    if (own >= 3) scoredThreePlus += 1;
  }
  if (scoredThreePlus < 3) return null;
  return {
    id: makeId(["goals", String(team.id), String(scoredThreePlus)]),
    icon: "⚽",
    title: `${team.shortName} balança a rede sem dó`,
    detail: `Marcou 3+ gols em ${scoredThreePlus} dos últimos ${last6.length} jogos (${totalScored} no total).`,
    source: "data",
  };
}

/** Histórico recente de confronto direto entre dois times (rivalidade). */
export function h2hInsight(
  teamA: ResolvedTeam,
  teamB: ResolvedTeam,
  h2h: FdMatch[]
): Insight | null {
  if (h2h.length < 2) return null;
  let winsA = 0;
  let draws = 0;
  let winsB = 0;
  for (const match of h2h) {
    const r = resultFor(match, teamA.id);
    if (r === "W") winsA += 1;
    else if (r === "D") draws += 1;
    else if (r === "L") winsB += 1;
  }
  if (winsA === winsB) return null;
  const leader = winsA > winsB ? teamA : teamB;
  const trailing = winsA > winsB ? teamB : teamA;
  const score = `${Math.max(winsA, winsB)}-${draws}-${Math.min(winsA, winsB)}`;
  return {
    id: makeId(["h2h", String(teamA.id), String(teamB.id)]),
    icon: "🆚",
    title: `${leader.shortName} domina ${trailing.shortName} no histórico recente`,
    detail: `Últimos confrontos diretos: ${score} (V-E-D) a favor de ${leader.shortName}.`,
    source: "data",
  };
}

/** Liderança da liga ou disputa quente no topo. */
export function leagueLeadInsight(
  competitionCode: string,
  competitionName: string,
  standings: FdStandingsRow[]
): Insight | null {
  if (standings.length < 2) return null;
  const top = standings[0];
  const second = standings[1];
  if (!top || !second) return null;
  const gap = top.points - second.points;
  if (gap >= 5) {
    return {
      id: makeId(["lead", competitionCode, String(top.team.id), String(gap)]),
      icon: "👑",
      title: `${top.team.shortName} dispara na ${competitionName}`,
      detail: `${gap} pontos de vantagem sobre o ${second.team.shortName} (2º).`,
      source: "data",
    };
  }
  return {
    id: makeId(["lead", competitionCode, String(top.team.id), "tight"]),
    icon: "👑",
    title: `${competitionName}: ${top.team.shortName} lidera`,
    detail:
      gap === 0
        ? `Empatado em pontos com ${second.team.shortName}, mas à frente nos critérios de desempate.`
        : `${gap} ${gap === 1 ? "ponto" : "pontos"} à frente do ${second.team.shortName} (2º).`,
    source: "data",
  };
}
