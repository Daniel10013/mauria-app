import "server-only";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { generateStructured } from "@/lib/llm/gemini";

const TITLE_PROMPT = `Você gera títulos curtos para threads de chat sobre futebol.

Receba a primeira pergunta do usuário e a primeira resposta do guru, e devolva
um título de 3 a 6 palavras em português, sem aspas, sem ponto final, em forma
de frase nominal (não pergunta). Foque no tema central da conversa.

Responda SOMENTE com JSON no formato:
{"title": "..."}

Exemplos:
- Pergunta: "Liverpool x City quem ganha?" + Resposta: "..."
  -> {"title": "Liverpool x City no fim de semana"}
- Pergunta: "Como tá o Palmeiras esse ano?"
  -> {"title": "Palmeiras na temporada"}`;

const titleSchema = z.object({ title: z.string().min(2).max(80) });

interface FirstExchange {
  userMessage: string;
  assistantReply: string;
}

/**
 * Gera um título curto a partir da primeira troca user→assistant. Falha
 * silenciosa: devolve `null` se não conseguir gerar (a UI mantém "Nova
 * conversa").
 */
export async function generateThreadTitle(
  exchange: FirstExchange
): Promise<string | null> {
  const prompt = `Pergunta: ${exchange.userMessage}\n\nResposta: ${exchange.assistantReply}`;
  const result = await generateStructured<unknown>({
    prompt,
    schemaDescription: TITLE_PROMPT,
  });
  if (!result.ok) return null;
  const parsed = titleSchema.safeParse(result.data);
  if (!parsed.success) {
    logger.warn("chat.title.parse_failed");
    return null;
  }
  return parsed.data.title.trim();
}
