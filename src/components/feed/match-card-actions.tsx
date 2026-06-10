"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createThreadAndAsk } from "@/lib/chat/start-thread";
import { HeadToHeadPopover } from "./head-to-head-popover";

interface MatchCardActionsProps {
  matchId: number;
  question: string;
}

export function MatchCardActions({
  matchId,
  question,
}: MatchCardActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function onPalpite() {
    if (busy) return;
    setBusy(true);
    startTransition(async () => {
      const result = await createThreadAndAsk(question);
      if (!result.ok) {
        toast.error(result.error);
        setBusy(false);
        return;
      }
      router.push(result.data.redirectTo);
    });
  }

  return (
    <footer className="flex items-center justify-between gap-1 border-t border-border/40 pt-2">
      <HeadToHeadPopover matchId={matchId} />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onPalpite}
        disabled={pending || busy}
        className="h-8 gap-1.5 px-2 text-xs text-brand-accent hover:bg-brand-primary/10 hover:text-brand-accent"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Ver palpite
      </Button>
    </footer>
  );
}
