import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/auth/profile";
import { getTeamById } from "@/lib/data/teams";
import {
  buildGuruSystemPrompt,
  PREDICTION_CONTEXT_INSTRUCTIONS,
} from "@/lib/llm/prompts";
import { streamGuruReply, type GeminiMessage } from "@/lib/llm/gemini";
import { detectIntent } from "@/lib/llm/intent";
import { resolveTeam } from "@/lib/football/resolver";
import { gatherPredictionData } from "@/lib/prediction/data";
import { calculatePrediction } from "@/lib/prediction/calculator";
import {
  buildPredictionCard,
  type PredictionCardData,
} from "@/lib/prediction/card";
import { generateThreadTitle } from "@/lib/chat/title";

export const runtime = "nodejs";

const HISTORY_LIMIT = 20;

const bodySchema = z.object({
  threadId: z.string().uuid("threadId inválido."),
  message: z
    .string()
    .min(1, "Mensagem vazia.")
    .max(2000, "Mensagem grande demais. Tenta resumir."),
});

function sse(event: object): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

interface PredictionPipelineResult {
  card: PredictionCardData;
  narrativeContext: string;
}

async function runPredictionPipeline(
  userMessage: string
): Promise<PredictionPipelineResult | null> {
  const t0 = Date.now();
  const intent = await detectIntent(userMessage);
  if (intent.type !== "prediction") return null;

  const [teamA, teamB] = await Promise.all([
    resolveTeam(intent.teamAQuery),
    resolveTeam(intent.teamBQuery),
  ]);
  if (!teamA || !teamB) {
    logger.info("prediction.pipeline", {
      stage: "resolve_failed",
      teamA: Boolean(teamA),
      teamB: Boolean(teamB),
    });
    return null;
  }

  const data = await gatherPredictionData(teamA, teamB);
  const result = calculatePrediction(data);
  const card = buildPredictionCard(data, result);
  logger.info("prediction.pipeline", {
    stage: "ready",
    ms: Date.now() - t0,
    home: card.home.id,
    away: card.away.id,
  });
  return { card, narrativeContext: result.narrativeContext };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 }
      );
    }
    parsedBody = parsed.data;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido." },
      { status: 400 }
    );
  }

  const { threadId, message } = parsedBody;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, userId: true },
  });
  if (!thread) {
    return NextResponse.json(
      { ok: false, error: "Conversa não encontrada." },
      { status: 404 }
    );
  }
  if (thread.userId !== user.id) {
    return NextResponse.json(
      { ok: false, error: "Acesso negado." },
      { status: 403 }
    );
  }

  const profile = await getOrCreateProfile(user.id, user.email);
  const team = profile.favoriteTeamId
    ? getTeamById(profile.favoriteTeamId)
    : null;

  const previousMessages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  });
  const history: GeminiMessage[] = previousMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      content: m.content,
    }));

  const userMessageRow = await prisma.chatMessage.create({
    data: { threadId, role: "user", content: message },
    select: { id: true },
  });

  // Tenta rodar o pipeline de previsão antes do stream. Falha silenciosa
  // — se nada funcionar, segue como conversa normal.
  let prediction: PredictionPipelineResult | null = null;
  try {
    prediction = await runPredictionPipeline(message);
  } catch (error) {
    logger.warn("prediction.pipeline.failed", {
      threadId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const baseSystemPrompt = buildGuruSystemPrompt({
    displayName: profile.displayName,
    favoriteTeam: team ? { id: team.id, name: team.name } : null,
    followedLeagues: profile.followedLeagues,
    style: profile.style,
  });
  const systemPrompt = prediction
    ? `${baseSystemPrompt}\n${PREDICTION_CONTEXT_INSTRUCTIONS}`
    : baseSystemPrompt;

  const isFirstExchange = previousMessages.length === 0;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fullText = "";
      try {
        if (prediction) {
          controller.enqueue(
            encoder.encode(
              sse({ type: "prediction", card: prediction.card })
            )
          );
        }

        for await (const chunk of streamGuruReply({
          systemPrompt,
          history,
          userMessage: message,
          contextData: prediction?.narrativeContext,
        })) {
          fullText += chunk;
          controller.enqueue(encoder.encode(sse({ type: "chunk", text: chunk })));
        }

        const assistantMessageRow = await prisma.chatMessage.create({
          data: {
            threadId,
            role: "assistant",
            content: fullText,
            metadata: prediction
              ? { predictionCard: prediction.card as unknown as object }
              : undefined,
          },
          select: { id: true },
        });

        await prisma.chatThread.update({
          where: { id: threadId },
          data: { updatedAt: new Date() },
        });

        controller.enqueue(
          encoder.encode(
            sse({ type: "done", messageId: assistantMessageRow.id })
          )
        );
        controller.close();

        if (isFirstExchange) {
          void (async () => {
            try {
              const title = await generateThreadTitle({
                userMessage: message,
                assistantReply: fullText,
              });
              if (title) {
                await prisma.chatThread.update({
                  where: { id: threadId },
                  data: { title },
                });
              }
            } catch (error) {
              logger.warn("chat.title.background_failed", {
                error: String(error),
              });
            }
          })();
        }
      } catch (error) {
        const errMessage =
          error instanceof Error ? error.message : "stream_error";
        logger.error("chat.stream_failed", {
          threadId,
          userMessageId: userMessageRow.id,
          error: errMessage,
        });
        try {
          controller.enqueue(
            encoder.encode(sse({ type: "error", error: errMessage }))
          );
        } finally {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
