import "server-only";
import { logger } from "@/lib/logger";
import { generateStructured } from "./gemini";
import { INTENT_PREDICTION_PROMPT } from "./prompts";

export type Intent =
  | { type: "prediction"; teamAQuery: string; teamBQuery: string }
  | { type: "general" };

const TRIGGERS = [
  /\bx\b/i,
  /\bvs\.?\b/i,
  /\bcontra\b/i,
  /\bquem ganha\b/i,
  /\bquem vence\b/i,
  /\bpalpite\b/i,
  /\bprevis(ão|ao)\b/i,
  /\bvai (vencer|ganhar|perder)\b/i,
  /\bjoga melhor\b/i,
];

function looksLikePrediction(message: string): boolean {
  return TRIGGERS.some((rx) => rx.test(message));
}

interface StructuredResponse {
  isPrediction?: boolean;
  teamA?: string | null;
  teamB?: string | null;
}

/**
 * Heurística rápida + confirmação via Gemini. Evita gastar token em conversas
 * que claramente não são previsão.
 */
export async function detectIntent(userMessage: string): Promise<Intent> {
  const trimmed = userMessage.trim();
  if (!trimmed) return { type: "general" };
  if (!looksLikePrediction(trimmed)) {
    logger.info("llm.intent", { stage: "heuristic", result: "general" });
    return { type: "general" };
  }

  // attempts: 1 — isto roda ANTES do stream começar; retries com backoff
  // aqui adicionavam até ~11s de tela parada. Falhou → trata como geral.
  const result = await generateStructured<StructuredResponse>({
    prompt: trimmed,
    schemaDescription: INTENT_PREDICTION_PROMPT,
    attempts: 1,
  });

  if (!result.ok) {
    logger.warn("llm.intent", { stage: "llm", result: "fallback_general" });
    return { type: "general" };
  }

  const { isPrediction, teamA, teamB } = result.data;
  if (isPrediction && teamA && teamB) {
    logger.info("llm.intent", { stage: "llm", result: "prediction" });
    return { type: "prediction", teamAQuery: teamA, teamBQuery: teamB };
  }
  logger.info("llm.intent", { stage: "llm", result: "general" });
  return { type: "general" };
}
