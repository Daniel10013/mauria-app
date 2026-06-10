"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PredictionCardData } from "@/lib/prediction/card";
import { Composer } from "./composer";
import { StreamingMessage } from "./streaming-message";

interface ChatRealtimeProps {
  threadId: string;
  initialPrompt?: string | null;
}

interface SseEvent {
  type: "chunk" | "done" | "error" | "prediction";
  text?: string;
  error?: string;
  messageId?: string;
  card?: PredictionCardData;
}

type ErrorKind = "rate_limit" | "network" | "generic";

function classifyError(error: string): ErrorKind {
  const e = error.toLowerCase();
  if (e.includes("rate") || e.includes("429")) return "rate_limit";
  if (e.includes("network") || e.includes("fetch") || e.includes("connection")) {
    return "network";
  }
  return "generic";
}

function messageFor(kind: ErrorKind): string {
  switch (kind) {
    case "rate_limit":
      return "Tô atendendo muita gente agora, irmão. Tenta de novo daqui a uns minutinhos.";
    case "network":
      return "Caiu a conexão. Tenta mandar de novo.";
    default:
      return "Não consegui responder agora. Tenta de novo.";
  }
}

export function ChatRealtime({ threadId, initialPrompt }: ChatRealtimeProps) {
  const router = useRouter();
  const [streaming, setStreaming] = useState<{
    text: string;
    card: PredictionCardData | null;
  } | null>(null);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [retryable, setRetryable] = useState<{ message: string } | null>(null);
  const initialFiredRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      setRetryable(null);
      setPendingUser(message);
      setStreaming({ text: "", card: null });
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ threadId, message }),
        });
        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => ({}));
          const kind = classifyError(data?.error ?? `${response.status}`);
          toast.error(messageFor(kind));
          if (kind === "network" || kind === "generic") {
            setRetryable({ message });
          }
          setStreaming(null);
          setPendingUser(null);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";
        let card: PredictionCardData | null = null;
        let errored = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const block of events) {
            const line = block.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            const payload = line.slice(6);
            try {
              const parsed = JSON.parse(payload) as SseEvent;
              if (parsed.type === "chunk" && parsed.text) {
                acc += parsed.text;
                setStreaming({ text: acc, card });
              } else if (parsed.type === "prediction" && parsed.card) {
                card = parsed.card;
                setStreaming({ text: acc, card });
              } else if (parsed.type === "error") {
                errored = true;
                const kind = classifyError(parsed.error ?? "");
                toast.error(messageFor(kind));
                if (kind === "network" || kind === "generic") {
                  setRetryable({ message });
                }
              }
            } catch {
              // ignora frames mal formados; o servidor não deve mandar isso.
            }
          }
        }

        setStreaming(null);
        setPendingUser(null);
        if (!errored) router.refresh();
      } catch {
        toast.error(messageFor("network"));
        setRetryable({ message });
        setStreaming(null);
        setPendingUser(null);
      }
    },
    [router, threadId]
  );

  useEffect(() => {
    if (!initialPrompt || initialFiredRef.current) return;
    initialFiredRef.current = true;
    void sendMessage(initialPrompt);
  }, [initialPrompt, sendMessage]);

  // Auto-scroll suave: sempre que chega um chunk, leva o "fim" da conversa
  // pra dentro do viewport.
  useEffect(() => {
    if (!streaming) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [streaming]);

  function onRetry() {
    if (!retryable) return;
    void sendMessage(retryable.message);
  }

  return (
    <div className="flex flex-col gap-5">
      {pendingUser && (
        <div className="flex w-full justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand-secondary/90 px-4 py-3 text-sm text-white">
            <p className="whitespace-pre-wrap leading-relaxed">{pendingUser}</p>
          </div>
        </div>
      )}
      {streaming && (
        <StreamingMessage
          text={streaming.text}
          predictionCard={streaming.card}
        />
      )}
      {retryable && !streaming && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">
            Não consegui mandar a última mensagem.
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-8 gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Repetir
          </Button>
        </div>
      )}
      <div ref={bottomRef} />
      <div className="sticky bottom-4">
        <Composer isStreaming={streaming !== null} onSend={sendMessage} autoFocus />
      </div>
    </div>
  );
}
