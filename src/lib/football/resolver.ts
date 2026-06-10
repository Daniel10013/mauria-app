import "server-only";
import { logger } from "@/lib/logger";
import { TEAMS, getTeamById, type Team } from "@/lib/data/teams";
import { TEAM_ALIASES } from "@/lib/data/team-aliases";
import { getTeam, searchTeams } from "./client";

export interface ResolvedTeam {
  id: number;
  name: string;
  shortName: string;
  crest?: string;
  /** De onde veio o match — útil pra debug/logs. */
  source: "alias" | "exact" | "fuzzy" | "api";
}

function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function fromCurated(team: Team, source: ResolvedTeam["source"]): ResolvedTeam {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    source,
  };
}

/** Levenshtein-light: distância simples entre duas strings (sem otimização). */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  return dp[a.length]![b.length]!;
}

/**
 * Resolve um texto livre para um time da Football-Data. Estratégia em 3
 * camadas:
 *
 * 1. **Apelido conhecido** (`team-aliases.ts`) — match exato em mapa.
 * 2. **Match exato/substring** na lista curada por `name` ou `shortName`.
 * 3. **Match fuzzy** (Levenshtein, distância <= 2) na lista curada.
 * 4. **Fallback API** — `/teams?name=` da Football-Data com cache.
 *
 * Devolve `null` se nada bateu.
 */
export async function resolveTeam(
  query: string
): Promise<ResolvedTeam | null> {
  const norm = normalize(query);
  if (!norm) return null;

  // 1. Apelidos.
  const aliasTarget = TEAM_ALIASES[norm];
  if (aliasTarget) {
    const team = TEAMS.find((t) => t.name === aliasTarget);
    if (team) {
      logger.info("football.resolve", { query, source: "alias", id: team.id });
      return fromCurated(team, "alias");
    }
  }

  // 2. Match exato/substring por name ou shortName.
  const exact = TEAMS.find(
    (t) => normalize(t.name) === norm || normalize(t.shortName) === norm
  );
  if (exact) {
    logger.info("football.resolve", { query, source: "exact", id: exact.id });
    return fromCurated(exact, "exact");
  }
  const substring = TEAMS.find((t) => {
    const n = normalize(t.name);
    const sn = normalize(t.shortName);
    return n.includes(norm) || sn.includes(norm) || norm.includes(sn);
  });
  if (substring) {
    logger.info("football.resolve", {
      query,
      source: "exact",
      id: substring.id,
    });
    return fromCurated(substring, "exact");
  }

  // 3. Fuzzy.
  let best: { team: Team; dist: number } | null = null;
  for (const team of TEAMS) {
    const candidates = [normalize(team.name), normalize(team.shortName)];
    for (const candidate of candidates) {
      const d = distance(norm, candidate);
      if (best === null || d < best.dist) best = { team, dist: d };
    }
  }
  if (best && best.dist <= 2) {
    logger.info("football.resolve", {
      query,
      source: "fuzzy",
      id: best.team.id,
      dist: best.dist,
    });
    return fromCurated(best.team, "fuzzy");
  }

  // 4. Fallback API.
  const apiResult = await searchTeams(query);
  if (!apiResult.ok) {
    logger.warn("football.resolve.api_failed", {
      query,
      error: apiResult.error,
    });
    return null;
  }
  const first = apiResult.data.teams[0];
  if (!first) {
    logger.info("football.resolve", { query, source: "api", result: "none" });
    return null;
  }
  logger.info("football.resolve", { query, source: "api", id: first.id });
  return {
    id: first.id,
    name: first.name,
    shortName: first.shortName,
    crest: first.crest,
    source: "api",
  };
}

/**
 * Variante por id numérico: resolve um time conhecido pela lista curada e
 * tenta enriquecer com `crest` da Football-Data. Não falha o fluxo se a API
 * estiver indisponível: devolve só os dados curados.
 */
export async function resolveTeamById(
  id: number
): Promise<ResolvedTeam | null> {
  const curated = getTeamById(id);
  const apiResult = await getTeam(id);
  if (apiResult.ok) {
    return {
      id: apiResult.data.id,
      name: apiResult.data.name,
      shortName: apiResult.data.shortName ?? curated?.shortName ?? apiResult.data.name,
      crest: apiResult.data.crest,
      source: "api",
    };
  }
  if (curated) {
    return {
      id: curated.id,
      name: curated.name,
      shortName: curated.shortName,
      source: "exact",
    };
  }
  return null;
}
