"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { League } from "@/lib/data/leagues";
import { completeOnboardingAction } from "../actions";

interface LeaguePickerProps {
  leagues: League[];
  initialSelection: string[];
  teamShortName: string | null;
}

export function LeaguePicker({
  leagues,
  initialSelection,
  teamShortName,
}: LeaguePickerProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelection)
  );
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function onConfirm() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const result = await completeOnboardingAction(ids);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Tudo pronto! 🟢");
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {teamShortName && (
        <p className="text-sm text-muted-foreground">
          Já incluímos a liga do{" "}
          <span className="font-semibold text-foreground">{teamShortName}</span>
          . Adicione outras se quiser.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {leagues.map((league) => {
          const isSelected = selected.has(league.id);
          return (
            <button
              key={league.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggle(league.id)}
              className={cn(
                "flex items-center justify-between rounded-xl border bg-card p-4 text-left transition",
                "hover:border-brand-accent hover:bg-accent/40",
                isSelected
                  ? "border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent"
                  : "border-border"
              )}
            >
              <span className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {league.emoji}
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold">{league.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {league.country}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "h-5 w-5 rounded-full border",
                  isSelected
                    ? "border-brand-accent bg-brand-accent"
                    : "border-border"
                )}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onConfirm}
          disabled={selected.size === 0 || isPending}
        >
          {isPending ? "Concluindo..." : "Concluir"}
        </Button>
      </div>
    </div>
  );
}
