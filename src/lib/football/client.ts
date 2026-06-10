import "server-only";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";
import { TTL, withCache } from "./cache";
import type {
  FdHeadToHeadResponse,
  FdMatch,
  FdMatchesResponse,
  FdStandingsResponse,
  FdTeam,
} from "./types";

const BASE_URL = "https://api.football-data.org/v4";

type FetchError =
  | "rate_limited"
  | "upstream_error"
  | "not_found"
  | "forbidden"
  | "fetch_failed";

class FootballDataError extends Error {
  constructor(public readonly code: FetchError, message: string) {
    super(message);
    this.name = "FootballDataError";
  }
}

async function rawFetch<T>(path: string): Promise<T> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new FootballDataError(
      "fetch_failed",
      "FOOTBALL_DATA_API_KEY missing"
    );
  }

  const t0 = Date.now();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-Auth-Token": apiKey },
      cache: "no-store",
    });
  } catch (error) {
    logger.error("football.fetch.network", { path, error: String(error) });
    throw new FootballDataError("fetch_failed", "network error");
  }

  const ms = Date.now() - t0;

  if (response.status === 429) {
    logger.warn("football.fetch", { path, ms, status: 429 });
    throw new FootballDataError("rate_limited", "Football-Data rate limited");
  }
  if (response.status === 403) {
    logger.warn("football.fetch", { path, ms, status: 403 });
    throw new FootballDataError("forbidden", "forbidden by plan");
  }
  if (response.status === 404) {
    logger.warn("football.fetch", { path, ms, status: 404 });
    throw new FootballDataError("not_found", "resource not found");
  }
  if (response.status >= 500) {
    logger.error("football.fetch", { path, ms, status: response.status });
    throw new FootballDataError("upstream_error", "upstream 5xx");
  }
  if (!response.ok) {
    logger.error("football.fetch", { path, ms, status: response.status });
    throw new FootballDataError("fetch_failed", `unexpected ${response.status}`);
  }

  logger.info("football.fetch", { path, ms, status: 200 });
  return (await response.json()) as T;
}

/**
 * Wrapper genérico: chama o `fetcher` envolto em cache + Result. Captura
 * `FootballDataError` e devolve como `Result.error`.
 */
async function withResult<T>(
  cacheKey: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await withCache<T>(cacheKey, ttlMs, fetcher);
    return ok(data);
  } catch (error) {
    if (error instanceof FootballDataError) {
      return err(error.code);
    }
    logger.error("football.unexpected", { error: String(error) });
    return err("fetch_failed");
  }
}

export function getTeam(teamId: number): Promise<Result<FdTeam>> {
  return withResult(`football:team:${teamId}`, TTL.team, () =>
    rawFetch<FdTeam>(`/teams/${teamId}`)
  );
}

export function getTeamUpcomingMatches(
  teamId: number,
  limit = 10
): Promise<Result<FdMatchesResponse>> {
  return withResult(
    `football:team:${teamId}:matches:scheduled:${limit}`,
    TTL.upcomingMatches,
    () =>
      rawFetch<FdMatchesResponse>(
        `/teams/${teamId}/matches?status=SCHEDULED&limit=${limit}`
      )
  );
}

export function getTeamRecentMatches(
  teamId: number,
  limit = 10
): Promise<Result<FdMatchesResponse>> {
  return withResult(
    `football:team:${teamId}:matches:finished:${limit}`,
    TTL.recentMatches,
    () =>
      rawFetch<FdMatchesResponse>(
        `/teams/${teamId}/matches?status=FINISHED&limit=${limit}`
      )
  );
}

export function getCompetitionStandings(
  code: string
): Promise<Result<FdStandingsResponse>> {
  return withResult(
    `football:competition:${code}:standings`,
    TTL.competitionStandings,
    () => rawFetch<FdStandingsResponse>(`/competitions/${code}/standings`)
  );
}

export function getCompetitionMatches(
  code: string,
  matchday?: number
): Promise<Result<FdMatchesResponse>> {
  const suffix = matchday !== undefined ? `?matchday=${matchday}` : "";
  const keySuffix = matchday !== undefined ? `:md:${matchday}` : "";
  return withResult(
    `football:competition:${code}:matches${keySuffix}`,
    TTL.competitionMatches,
    () => rawFetch<FdMatchesResponse>(`/competitions/${code}/matches${suffix}`)
  );
}

/**
 * Jogos por intervalo de datas (YYYY-MM-DD), cruzando todas as competições
 * cobertas pelo plano. Usado pelo contexto de "jogos de hoje/amanhã" do chat.
 */
export function getMatchesByDate(
  dateFrom: string,
  dateTo: string
): Promise<Result<FdMatchesResponse>> {
  return withResult(
    `football:matches:${dateFrom}:${dateTo}`,
    TTL.dateMatches,
    () =>
      rawFetch<FdMatchesResponse>(
        `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
      )
  );
}

export function getMatch(matchId: number): Promise<Result<FdMatch>> {
  return withResult(`football:match:${matchId}`, TTL.match, () =>
    rawFetch<FdMatch>(`/matches/${matchId}`)
  );
}

export interface FdTeamsSearchResponse {
  count: number;
  teams: FdTeam[];
}

/**
 * Busca times pelo nome (Football-Data v4). Cache 24h por query normalizada.
 * Usado como fallback no resolver (`src/lib/football/resolver.ts`).
 */
export function searchTeams(name: string): Promise<Result<FdTeamsSearchResponse>> {
  const normalized = name.trim().toLowerCase();
  return withResult(
    `football:search:teams:${normalized}`,
    TTL.team,
    () =>
      rawFetch<FdTeamsSearchResponse>(
        `/teams?name=${encodeURIComponent(name)}`
      )
  );
}

/**
 * Histórico de confronto direto entre os dois times de um match. No plano
 * free, alguns matches retornam 403 — o `withResult` propaga como
 * `error: "forbidden"`, e o consumidor (UI do MatchCard) traduz pra
 * mensagem amigável "Sem histórico disponível neste plano".
 */
export function getHeadToHead(
  matchId: number,
  limit = 5
): Promise<Result<FdHeadToHeadResponse>> {
  return withResult(
    `football:match:${matchId}:h2h:${limit}`,
    TTL.headToHead,
    () =>
      rawFetch<FdHeadToHeadResponse>(
        `/matches/${matchId}/head2head?limit=${limit}`
      )
  );
}
