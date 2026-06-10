import "server-only";
import { logger } from "@/lib/logger";
import {
  getCompetitionMatches,
  getCompetitionStandings,
  getTeamRecentMatches,
  getTeamUpcomingMatches,
} from "@/lib/football/client";
import type {
  FdMatch,
  FdStandingsRow,
} from "@/lib/football/types";
import type { ResolvedTeam } from "@/lib/football/resolver";
import { getLeagueById, type League } from "@/lib/data/leagues";
import type { ResolvedProfile } from "@/lib/auth/profile";
import {
  goalsInsight,
  leagueLeadInsight,
  streakInsight,
  unbeatenInsight,
  type Insight,
} from "./insights";

export interface Suggestion {
  id: string;
  text: string;
  intent?: "prediction" | "analysis" | "curiosity";
}

export interface FeedData {
  upcomingMatches: FdMatch[];
  insights: Insight[];
  suggestions: Suggestion[];
  /** Quando true, alguma chamada externa falhou — UI mostra banner. */
  partial: boolean;
}

const UPCOMING_LIMIT = 10;
const PER_LEAGUE_LIMIT = 5;
const RECENT_FOR_INSIGHTS = 10;

function dedupAndSortMatches(matches: FdMatch[]): FdMatch[] {
  const seen = new Set<number>();
  const result: FdMatch[] = [];
  for (const match of matches) {
    if (seen.has(match.id)) continue;
    seen.add(match.id);
    result.push(match);
  }
  return result.sort(
    (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
  );
}

async function gatherUpcomingMatches(
  favorite: ResolvedTeam | null,
  leagues: League[]
): Promise<{ matches: FdMatch[]; partial: boolean }> {
  let partial = false;

  const teamPromise = favorite
    ? getTeamUpcomingMatches(favorite.id, UPCOMING_LIMIT)
    : Promise.resolve({ ok: true as const, data: { count: 0, matches: [] } });

  const leaguePromises = leagues.map((league) => getCompetitionMatches(league.code));

  const [teamResult, ...leagueResults] = await Promise.all([
    teamPromise,
    ...leaguePromises,
  ]);

  const collected: FdMatch[] = [];

  if (teamResult.ok) {
    collected.push(...teamResult.data.matches);
  } else {
    partial = true;
    logger.warn("feed.upcoming.team_failed", { error: teamResult.error });
  }

  const now = Date.now();
  for (let i = 0; i < leagueResults.length; i++) {
    const result = leagueResults[i]!;
    const league = leagues[i]!;
    if (!result.ok) {
      partial = true;
      logger.warn("feed.upcoming.league_failed", {
        league: league.code,
        error: result.error,
      });
      continue;
    }
    // `competition/{code}/matches` devolve a temporada inteira — filtra os
    // próximos N que ainda não rolaram.
    const upcoming = result.data.matches
      .filter(
        (m) =>
          (m.status === "SCHEDULED" || m.status === "TIMED") &&
          new Date(m.utcDate).getTime() >= now
      )
      .sort(
        (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
      )
      .slice(0, PER_LEAGUE_LIMIT);
    collected.push(...upcoming);
  }

  const matches = dedupAndSortMatches(collected).slice(0, UPCOMING_LIMIT);
  return { matches, partial };
}

async function gatherInsights(
  favorite: ResolvedTeam | null,
  leagues: League[]
): Promise<{ insights: Insight[]; partial: boolean }> {
  let partial = false;
  const insights: Insight[] = [];

  if (favorite) {
    const recentResult = await getTeamRecentMatches(
      favorite.id,
      RECENT_FOR_INSIGHTS
    );
    if (recentResult.ok) {
      const recent = recentResult.data.matches;
      const candidates = [
        streakInsight(favorite, recent),
        unbeatenInsight(favorite, recent),
        goalsInsight(favorite, recent),
      ];
      for (const c of candidates) if (c) insights.push(c);
    } else {
      partial = true;
      logger.warn("feed.insights.team_failed", {
        error: recentResult.error,
      });
    }
  }

  const standingsResults = await Promise.all(
    leagues.slice(0, 3).map((league) =>
      getCompetitionStandings(league.code).then((result) => ({
        result,
        league,
      }))
    )
  );
  for (const { result, league } of standingsResults) {
    if (!result.ok) {
      partial = true;
      logger.warn("feed.insights.standings_failed", {
        league: league.code,
        error: result.error,
      });
      continue;
    }
    const totalTable: FdStandingsRow[] | undefined = result.data.standings.find(
      (s) => s.type === "TOTAL"
    )?.table;
    if (!totalTable) continue;
    const insight = leagueLeadInsight(league.code, league.name, totalTable);
    if (insight) insights.push(insight);
  }

  // Limita a 5 e mantém variedade (não duplicar tipos quando possível).
  return { insights: insights.slice(0, 5), partial };
}

function buildSuggestions(
  favorite: ResolvedTeam | null,
  leagues: League[],
  upcoming: FdMatch[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  if (favorite) {
    suggestions.push({
      id: "fav_status",
      text: `Como tá o ${favorite.shortName} esse ano?`,
      intent: "analysis",
    });
    const nextOfFavorite = upcoming.find(
      (m) => m.homeTeam.id === favorite.id || m.awayTeam.id === favorite.id
    );
    if (nextOfFavorite) {
      const opp =
        nextOfFavorite.homeTeam.id === favorite.id
          ? nextOfFavorite.awayTeam
          : nextOfFavorite.homeTeam;
      suggestions.push({
        id: "fav_next",
        text: `Vai ganhar o jogo contra o ${opp.shortName}?`,
        intent: "prediction",
      });
    } else {
      suggestions.push({
        id: "fav_pred_generic",
        text: `Quem ganha o próximo clássico do ${favorite.shortName}?`,
        intent: "prediction",
      });
    }
  } else {
    suggestions.push({
      id: "no_fav_generic",
      text: "Quais os jogos importantes desta semana?",
      intent: "analysis",
    });
    suggestions.push({
      id: "no_fav_pred",
      text: "Quem ganha Real Madrid x Barcelona?",
      intent: "prediction",
    });
  }

  const firstLeague = leagues[0];
  if (firstLeague) {
    suggestions.push({
      id: "league_lead",
      text: `Quem lidera a ${firstLeague.name}?`,
      intent: "analysis",
    });
  }

  suggestions.push({
    id: "story_champions",
    text: "Me conta uma história legal da Champions League.",
    intent: "curiosity",
  });

  return suggestions.slice(0, 4);
}

/**
 * Constrói o feed da home a partir do profile do usuário. Faz chamadas em
 * paralelo, degrada gracefully (insights/upcoming podem vir vazios) e
 * sempre retorna pelo menos as `suggestions` estáticas baseadas no perfil.
 */
export async function buildFeedData(
  profile: ResolvedProfile
): Promise<FeedData> {
  const t0 = Date.now();
  const leagues = profile.followedLeagues
    .map((id) => getLeagueById(id))
    .filter((l): l is League => Boolean(l));

  const [upcomingPart, insightsPart] = await Promise.all([
    gatherUpcomingMatches(profile.favoriteTeam, leagues),
    gatherInsights(profile.favoriteTeam, leagues),
  ]);

  const suggestions = buildSuggestions(
    profile.favoriteTeam,
    leagues,
    upcomingPart.matches
  );

  const partial = upcomingPart.partial || insightsPart.partial;
  logger.info("feed.build", {
    ms: Date.now() - t0,
    upcoming: upcomingPart.matches.length,
    insights: insightsPart.insights.length,
    partial,
  });

  return {
    upcomingMatches: upcomingPart.matches,
    insights: insightsPart.insights,
    suggestions,
    partial,
  };
}
