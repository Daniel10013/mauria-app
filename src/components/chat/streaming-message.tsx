"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCyclingPhrase } from "@/hooks/use-cycling-phrase";
import { PredictionCard } from "./prediction-card";
import type { PredictionCardData } from "@/lib/prediction/card";

interface StreamingMessageProps {
  text: string;
  predictionCard?: PredictionCardData | null;
}

export function StreamingMessage({
  text,
  predictionCard,
}: StreamingMessageProps) {
  const isWaiting = text.length === 0;
  const phrase = useCyclingPhrase(predictionCard ? "prediction" : "chat");

  return (
    <div className="flex w-full gap-3">
      <Avatar className="mt-1 h-8 w-8 border border-border/40">
        <AvatarFallback className="bg-brand-primary/20 text-xs font-bold text-brand-accent">
          M
        </AvatarFallback>
      </Avatar>
      <div className="flex max-w-[85%] flex-col items-start gap-2">
        {predictionCard && <PredictionCard card={predictionCard} />}
        <div className="rounded-2xl rounded-bl-md border border-border/60 bg-card px-4 py-3 text-sm text-foreground">
          {isWaiting ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-brand-accent"
                aria-hidden
              />
              <span>{phrase}</span>
            </span>
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
          )}
        </div>
      </div>
    </div>
  );
}
