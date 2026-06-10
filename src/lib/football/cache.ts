import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const TTL = {
  team: 24 * 60 * 60 * 1000, // 24h
  upcomingMatches: 30 * 60 * 1000, // 30 min
  recentMatches: 60 * 60 * 1000, // 1h
  competitionStandings: 60 * 60 * 1000, // 1h
  competitionMatches: 30 * 60 * 1000, // 30 min
  match: 5 * 60 * 1000, // 5 min
  dateMatches: 10 * 60 * 1000, // 10 min — jogos do dia mudam de status com frequência
  headToHead: 24 * 60 * 60 * 1000, // 24h — histórico só muda quando rola novo jogo entre os dois
} as const;

/**
 * Lê uma entrada do cache. Devolve `null` se ausente ou expirada (e nesse
 * caso apaga a linha velha em background).
 */
export async function getCached<T>(key: string): Promise<T | null> {
  const row = await prisma.apiCache.findUnique({ where: { key } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    prisma.apiCache.delete({ where: { key } }).catch(() => {
      // expiração de cache pode falhar em corrida — log silencioso, não crítico
    });
    return null;
  }
  return row.payload as T;
}

/** Grava (upsert) uma entrada com TTL em ms. */
export async function setCached<T>(
  key: string,
  payload: T,
  ttlMs: number
): Promise<void> {
  const expiresAt = new Date(Date.now() + ttlMs);
  await prisma.apiCache.upsert({
    where: { key },
    create: {
      key,
      payload: payload as never,
      expiresAt,
    },
    update: {
      payload: payload as never,
      fetchedAt: new Date(),
      expiresAt,
    },
  });
}

/**
 * Cache-aside: tenta cache → fallback no fetcher → grava → retorna.
 * Loga `cache: 'hit' | 'miss'` e o tempo gasto.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  const cached = await getCached<T>(key);
  if (cached !== null) {
    logger.info("football.cache", { key, cache: "hit", ms: Date.now() - t0 });
    return cached;
  }
  const fresh = await fetcher();
  await setCached(key, fresh, ttlMs);
  logger.info("football.cache", { key, cache: "miss", ms: Date.now() - t0 });
  return fresh;
}
