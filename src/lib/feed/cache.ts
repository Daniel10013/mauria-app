import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveTeamById } from "@/lib/football/resolver";
import { buildFeedData, type FeedData } from "./data";
import { feedTagFor } from "./cache-key";

export { feedTagFor };
export const FEED_TTL_SECONDS = 60 * 5; // 5 minutos

const EMPTY_FEED: FeedData = {
  upcomingMatches: [],
  insights: [],
  suggestions: [],
  partial: false,
};

/**
 * Wrapper cacheado em torno de `buildFeedData`. A chave do cache é montada
 * a partir do profile (`userId + favoriteTeamId + ligas + watchedTeams`),
 * então mudanças nas preferências do usuário invalidam o cache automaticamente
 * — não dependemos só do `revalidateTag` da action de salvar.
 *
 * O profile é buscado no DB **fora** da função cacheada (consulta barata)
 * justamente pra que ele participe da chave. A parte cara (chamadas externas)
 * permanece dentro do `unstable_cache` com TTL de 5 min.
 */
export async function getCachedFeed(userId: string): Promise<FeedData> {
  const profile = await prisma.profile.findUnique({ where: { id: userId } });
  if (!profile) return EMPTY_FEED;

  const favoriteTeamPart = profile.favoriteTeamId
    ? String(profile.favoriteTeamId)
    : "none";
  const leaguesPart = [...profile.followedLeagues].sort().join(",");
  const watchedTeamsPart = [...profile.watchedTeams].sort().join(",");

  const fn = unstable_cache(
    async () => {
      const favoriteTeam = profile.favoriteTeamId
        ? await resolveTeamById(profile.favoriteTeamId)
        : null;
      return buildFeedData({ ...profile, favoriteTeam });
    },
    ["feed", userId, favoriteTeamPart, leaguesPart, watchedTeamsPart],
    {
      tags: [feedTagFor(userId)],
      revalidate: FEED_TTL_SECONDS,
    }
  );
  return fn();
}
