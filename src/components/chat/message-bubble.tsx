import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MarkdownText } from "./markdown-text";
import { PredictionCard } from "./prediction-card";
import type { PredictionCardData } from "@/lib/prediction/card";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  /** Quando true, o bubble do assistant não renderiza markdown (streaming bruto). */
  raw?: boolean;
  predictionCard?: PredictionCardData | null;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MessageBubble({
  role,
  content,
  createdAt,
  raw = false,
  predictionCard,
}: MessageBubbleProps) {
  const isUser = role === "user";
  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <Avatar className="mt-1 h-8 w-8 border border-border/40">
          <AvatarFallback className="bg-brand-primary/20 text-xs font-bold text-brand-accent">
            M
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {!isUser && predictionCard && <PredictionCard card={predictionCard} />}
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            isUser
              ? "rounded-br-md bg-brand-secondary/90 text-white"
              : "rounded-bl-md border border-border/60 bg-card text-foreground"
          )}
        >
          {isUser || raw ? (
            <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
          ) : (
            <MarkdownText>{content}</MarkdownText>
          )}
        </div>
        <span className="px-1 text-[10px] text-muted-foreground">
          {formatTime(createdAt)}
        </span>
      </div>
    </div>
  );
}
