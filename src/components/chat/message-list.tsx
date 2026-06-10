import { prisma } from "@/lib/prisma";
import type { PredictionCardData } from "@/lib/prediction/card";
import { MessageBubble } from "./message-bubble";

interface MessageListProps {
  threadId: string;
}

function readPredictionCard(metadata: unknown): PredictionCardData | null {
  if (!metadata || typeof metadata !== "object") return null;
  const card = (metadata as { predictionCard?: unknown }).predictionCard;
  if (!card || typeof card !== "object") return null;
  return card as PredictionCardData;
}

export async function MessageList({ threadId }: MessageListProps) {
  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Pode soltar a primeira pergunta. Tô esperando.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-1 py-4">
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          role={message.role === "assistant" ? "assistant" : "user"}
          content={message.content}
          createdAt={message.createdAt}
          predictionCard={readPredictionCard(message.metadata)}
        />
      ))}
    </div>
  );
}
