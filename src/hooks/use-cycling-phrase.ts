"use client";

import { useEffect, useState } from "react";
import {
  LOADING_PHRASES,
  type LoadingCategory,
} from "@/lib/ui/loading-phrases";

/**
 * Cicla entre as frases da categoria a cada `intervalMs` enquanto o componente
 * estiver montado. Determinístico do índice 0 → cresce; quando o componente
 * desmonta, o intervalo é cancelado.
 */
export function useCyclingPhrase(
  category: LoadingCategory,
  intervalMs = 1500
): string {
  const phrases = LOADING_PHRASES[category];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length <= 1) return;
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [phrases.length, intervalMs]);

  return phrases[index] ?? phrases[0]!;
}
