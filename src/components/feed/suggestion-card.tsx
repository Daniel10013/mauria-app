"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createThreadAndAsk } from "@/lib/chat/start-thread";
import type { Suggestion } from "@/lib/feed/data";

interface SuggestionCardProps {
  suggestion: Suggestion;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function onClick() {
    if (busy) return;
    setBusy(true);
    startTransition(async () => {
      const result = await createThreadAndAsk(suggestion.text);
      if (!result.ok) {
        toast.error(result.error);
        setBusy(false);
        return;
      }
      router.push(result.data.redirectTo);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending || busy}
      className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-accent/60 hover:bg-brand-primary/5 hover:shadow-md disabled:opacity-60"
    >
      <span className="text-sm font-medium leading-snug">{suggestion.text}</span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-accent"
        aria-hidden
      />
    </button>
  );
}
