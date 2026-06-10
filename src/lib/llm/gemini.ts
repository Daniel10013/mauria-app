import "server-only";
import OpenAI from "openai";
import { logger } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

// Nota histórica: este arquivo passou por três providers — Gemini (free tier
// zerado pela conta Google), Cerebras (modelos disponíveis eram pequenos
// demais e alucinavam) e agora OpenRouter (Llama 3.3 70B Instruct no tier
// :free). O nome do arquivo foi mantido para evitar churn nos imports;
// renomear para "llm.ts" é uma melhoria cosmética para um milestone futuro.

// GPT-OSS 120B via OpenRouter :free. Modelo aberto da OpenAI.
// Histórico: Llama 3.3 70B → Qwen 2.5 72B (removido) → Qwen3-next 80B
// (também 429) → GPT-OSS 120B. Fallbacks: nvidia/nemotron-3-super-120b-a12b:free,
// nousresearch/hermes-3-llama-3.1-405b:free.
// Override via env (LLM_MODEL) permite trocar pra um modelo mais rápido do
// OpenRouter (ex.: "google/gemini-2.5-flash") sem mudança de código.
const MODEL_NAME = process.env.LLM_MODEL?.trim() || "openai/gpt-oss-120b:free";

function getClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY missing");
  }
  return new OpenAI({
    apiKey: key,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      // Headers opcionais usados pelo OpenRouter para rankings e analytics.
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "MaurIA",
    },
  });
}

// Retry com backoff exponencial para 429/503 (rate limit ou capacity error
// no upstream do OpenRouter). Espera 1s, 3s, 7s entre tentativas.
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  label = "llm"
): Promise<T> {
  const delays = [1000, 3000, 7000];
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      const status = (e as { status?: number })?.status;
      const retriable = status === 429 || status === 503 || status === 502;
      if (!retriable || i === attempts - 1) throw e;
      const wait = delays[i] ?? 7000;
      logger.warn(`${label}.retry`, { attempt: i + 1, status, waitMs: wait });
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastError;
}

// Mantemos o nome GeminiMessage por compatibilidade com o código existente.
// Roles seguem a convenção interna: "user" e "model" (mapeados para "user"/
// "assistant" do OpenAI dentro deste módulo).
export type GeminiMessage = { role: "user" | "model"; content: string };

interface GenerateGuruArgs {
  systemPrompt: string;
  history: GeminiMessage[];
  userMessage: string;
  contextData?: string;
}

function buildMessages(args: GenerateGuruArgs) {
  const finalUserText = args.contextData
    ? `DADOS:\n${args.contextData}\n\nPERGUNTA:\n${args.userMessage}`
    : args.userMessage;

  return [
    { role: "system" as const, content: args.systemPrompt },
    ...args.history.map((m) => ({
      role: m.role === "model" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
    { role: "user" as const, content: finalUserText },
  ];
}

/**
 * Gera resposta conversacional com a persona do guru. Histórico é a lista
 * de turnos anteriores (sem o turno atual).
 */
export async function generateGuruReply(
  args: GenerateGuruArgs
): Promise<Result<{ text: string }>> {
  const t0 = Date.now();
  try {
    const client = getClient();
    const completion = await withRetry(
      () =>
        client.chat.completions.create({
          model: MODEL_NAME,
          messages: buildMessages(args),
          temperature: 0.7,
        }),
      3,
      "llm.guru"
    );

    const text = completion.choices[0]?.message?.content ?? "";

    const ms = Date.now() - t0;
    logger.info("llm.guru", {
      ms,
      historyLen: args.history.length,
      hasContext: Boolean(args.contextData),
      chars: text.length,
    });
    return ok({ text });
  } catch (error) {
    logger.error("llm.guru", { ms: Date.now() - t0, error: String(error) });
    return err("llm_error");
  }
}

interface GenerateStructuredArgs {
  prompt: string;
  schemaDescription: string;
  /**
   * Tentativas em caso de 429/5xx (default 3). Use 1 em caminhos sensíveis a
   * latência (ex.: detecção de intenção antes do stream), onde esperar
   * 1s+3s+7s de backoff é pior do que seguir sem o resultado.
   */
  attempts?: number;
}

/**
 * Pede uma resposta JSON estrita. Útil para classificação e extração
 * (ex.: detecção de intenção).
 */
export async function generateStructured<T>(
  args: GenerateStructuredArgs
): Promise<Result<T>> {
  const t0 = Date.now();
  try {
    const client = getClient();
    const fullPrompt = `${args.schemaDescription}\n\nENTRADA:\n${args.prompt}\n\nResponda APENAS com JSON válido, sem cercas de código nem texto extra.`;
    const completion = await withRetry(
      () =>
        client.chat.completions.create({
          model: MODEL_NAME,
          messages: [
            {
              role: "system",
              content:
                "Você é um classificador. Sua única tarefa é responder em JSON válido seguindo o esquema descrito pelo usuário. Nunca escreva texto fora do JSON.",
            },
            { role: "user", content: fullPrompt },
          ],
          temperature: 0,
          response_format: { type: "json_object" },
        }),
      args.attempts ?? 3,
      "llm.structured"
    );

    const raw = completion.choices[0]?.message?.content ?? "{}";
    // Defesa contra modelos que insistem em cercar com ```json ... ```.
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    const parsed = JSON.parse(cleaned) as T;
    logger.info("llm.structured", { ms: Date.now() - t0 });
    return ok(parsed);
  } catch (error) {
    logger.error("llm.structured", {
      ms: Date.now() - t0,
      error: String(error),
    });
    return err("llm_error");
  }
}

/**
 * Versão streaming do guru. Usado pelo Route Handler de chat (milestone 04).
 * Devolve um async iterator de chunks de texto.
 */
export async function* streamGuruReply(
  args: GenerateGuruArgs
): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  const stream = await client.chat.completions.create({
    model: MODEL_NAME,
    messages: buildMessages(args),
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
