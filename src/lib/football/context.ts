import "server-only";
import { logger } from "@/lib/logger";
import { getLeagueById } from "@/lib/data/leagues";
import { getCompetitionStandings, getMatchesByDate } from "./client";
import type { FdMatch } from "./types";

// Contexto de "dados atuais" para o chat: detecta perguntas sobre jogos do
// dia / tabela via regex (zero custo de LLM) e injeta dados reais da
// Football-Data no prompt. Resolve o problema do modelo responder agenda de
// jogos com dados de treino desatualizados.

const TZ = "America/Sao_Paulo";

/** Competições com cobertura no plano free da Football-Data. */
const FREE_TIER_CODES = new Set([
  "PL",
  "PD",
  "SA",
  "BL1",
  "FL1",
  "BSA",
  "CL",
  "EC",
  "WC",
]);

/** Apelidos comuns (normalizados, sem acento) → código da competição. */
const LEAGUE_ALIASES: Record<string, string> = {
  "premier league": "PL",
  premier: "PL",
  "campeonato ingles": "PL",
  "la liga": "PD",
  laliga: "PD",
  "campeonato espanhol": "PD",
  "serie a italiana": "SA",
  "campeonato italiano": "SA",
  calcio: "SA",
  bundesliga: "BL1",
  "campeonato alemao": "BL1",
  "ligue 1": "FL1",
  "campeonato frances": "FL1",
  brasileirao: "BSA",
  "campeonato brasileiro": "BSA",
  "serie a do brasileirao": "BSA",
  champions: "CL",
  "champions league": "CL",
  "liga dos campeoes": "CL",
  ucl: "CL",
  eurocopa: "EC",
  "copa do mundo": "WC",
};

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectLeague(normalizedMessage: string): string | null {
  // Aliases mais longos primeiro pra "serie a do brasileirao" não casar "serie a".
  const aliases = Object.keys(LEAGUE_ALIASES).sort(
    (a, b) => b.length - a.length
  );
  for (const alias of aliases) {
    if (normalizedMessage.includes(alias)) return LEAGUE_ALIASES[alias]!;
  }
  // "serie a" sozinho: só se não falou de Brasil.
  if (
    normalizedMessage.includes("serie a") &&
    !normalizedMessage.includes("brasil")
  ) {
    return "SA";
  }
  return null;
}

export interface InfoIntent {
  kind: "matches" | "standings";
  /** 0 = hoje, 1 = amanhã. Só para kind = "matches". */
  dayOffset: number;
  /** Código da competição (ex.: "PL") ou null = todas as cobertas. */
  leagueCode: string | null;
}

/**
 * Detecta pedidos de informação factual atual. Heurística pura (regex) —
 * não gasta chamada de LLM nem atrasa o stream.
 */
export function detectInfoIntent(
  message: string,
  followedLeagues: string[]
): InfoIntent | null {
  const norm = normalize(message);
  const detected = detectLeague(norm);
  const followedFallback =
    followedLeagues.find((id) => FREE_TIER_CODES.has(id)) ?? null;

  if (/\b(tabela|classificacao)\b/.test(norm)) {
    const leagueCode = detected ?? followedFallback;
    return leagueCode ? { kind: "standings", dayOffset: 0, leagueCode } : null;
  }

  const mentionsMatches =
    /\b(jogos?|partidas?|joga|rodada|agenda|programacao)\b/.test(norm);
  const today = /\bhoje\b/.test(norm);
  const tomorrow = /\bamanha\b/.test(norm);
  if (mentionsMatches && (today || tomorrow)) {
    return {
      kind: "matches",
      dayOffset: tomorrow ? 1 : 0,
      leagueCode: detected,
    };
  }
  return null;
}

function dateInSaoPaulo(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatTime(utcDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(utcDate));
}

function formatMatchLine(m: FdMatch): string {
  const home = m.homeTeam.shortName || m.homeTeam.name;
  const away = m.awayTeam.shortName || m.awayTeam.name;
  const ft = m.score.fullTime;
  switch (m.status) {
    case "IN_PLAY":
    case "PAUSED":
      return `- ${m.competition.name}: ${home} ${ft.home ?? 0} x ${ft.away ?? 0} ${away} (em andamento)`;
    case "FINISHED":
      return `- ${m.competition.name}: ${home} ${ft.home} x ${ft.away} ${away} (encerrado)`;
    case "POSTPONED":
      return `- ${m.competition.name}: ${home} x ${away} (adiado)`;
    case "SUSPENDED":
    case "CANCELLED":
      return `- ${m.competition.name}: ${home} x ${away} (cancelado/suspenso)`;
    default:
      return `- ${m.competition.name}: ${home} x ${away} — ${formatTime(m.utcDate)} (horário de Brasília)`;
  }
}

const COVERAGE_NOTE =
  "Cobertura: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Brasileirão Série A, Champions League, Eurocopa e Copa do Mundo. Libertadores, Sul-Americana e Copa do Brasil NÃO estão na fonte — se perguntarem, avise que não tem esses dados.";

async function buildMatchesContext(intent: InfoIntent): Promise<string | null> {
  const date = dateInSaoPaulo(intent.dayOffset);
  const result = await getMatchesByDate(date, date);
  if (!result.ok) {
    logger.warn("football.context.matches_failed", { error: result.error });
    return null;
  }
  let matches = result.data.matches;
  if (intent.leagueCode) {
    matches = matches.filter((m) => m.competition.code === intent.leagueCode);
  }
  const label = intent.dayOffset === 1 ? "amanhã" : "hoje";
  const leagueName = intent.leagueCode
    ? getLeagueById(intent.leagueCode)?.name ?? intent.leagueCode
    : null;
  const header = `=== DADOS ATUAIS (fonte: football-data.org, ${date}) ===\nJogos de ${label}${leagueName ? ` — ${leagueName}` : ""}:`;
  if (matches.length === 0) {
    return `${header}\n(nenhum jogo encontrado nessa data nas competições cobertas)\n${COVERAGE_NOTE}`;
  }
  const lines = matches.slice(0, 30).map(formatMatchLine);
  return [header, ...lines, COVERAGE_NOTE].join("\n");
}

async function buildStandingsContext(
  intent: InfoIntent
): Promise<string | null> {
  if (!intent.leagueCode) return null;
  const result = await getCompetitionStandings(intent.leagueCode);
  if (!result.ok) {
    logger.warn("football.context.standings_failed", { error: result.error });
    return null;
  }
  const table = result.data.standings.find((s) => s.type === "TOTAL")?.table;
  if (!table || table.length === 0) return null;
  const name = result.data.competition.name;
  const lines = table
    .slice(0, 20)
    .map(
      (row) =>
        `${row.position}. ${row.team.shortName || row.team.name} — ${row.points} pts (J ${row.playedGames}, V ${row.won}, E ${row.draw}, D ${row.lost}, SG ${row.goalDifference >= 0 ? "+" : ""}${row.goalDifference})`
    );
  return [
    `=== DADOS ATUAIS (fonte: football-data.org, ${dateInSaoPaulo(0)}) ===`,
    `Tabela atualizada — ${name}:`,
    ...lines,
  ].join("\n");
}

/**
 * Tenta montar um bloco de contexto factual pra mensagem. Devolve `null` se a
 * pergunta não é de agenda/tabela ou se a API falhar (o chat segue normal).
 */
export async function buildInfoContext(
  message: string,
  followedLeagues: string[]
): Promise<string | null> {
  const intent = detectInfoIntent(message, followedLeagues);
  if (!intent) return null;
  const t0 = Date.now();
  const context =
    intent.kind === "matches"
      ? await buildMatchesContext(intent)
      : await buildStandingsContext(intent);
  logger.info("football.context", {
    kind: intent.kind,
    league: intent.leagueCode,
    ok: context !== null,
    ms: Date.now() - t0,
  });
  return context;
}
