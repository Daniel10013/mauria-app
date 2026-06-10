"use client";

import { useCyclingPhrase } from "@/hooks/use-cycling-phrase";

/**
 * Frase curta de loading que cicla a cada 1.5s. Renderizada dentro do
 * skeleton do feed pra dar personalidade ao tempo de carregamento.
 */
export function FeedLoadingPhrase() {
  const phrase = useCyclingPhrase("feed");
  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      {phrase}
    </span>
  );
}
