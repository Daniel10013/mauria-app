// Helpers de chave de cache do feed. Vivem em arquivo próprio (sem
// `server-only`) para que Server Actions e Server Components possam importar
// sem trazer junto a árvore inteira de `cache.ts`/`data.ts`.

export function feedTagFor(userId: string): string {
  return `feed:${userId}`;
}
