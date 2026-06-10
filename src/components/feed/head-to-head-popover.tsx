"use client";

import * as React from "react";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { fetchHeadToHeadAction } from "@/app/(app)/feed-actions";
import type { H2HSummary } from "@/lib/feed/h2h-types";

interface HeadToHeadPopoverProps {
  matchId: number;
}

function formatScore(home: number | null, away: number | null): string {
  if (home === null || away === null) return "—";
  return `${home} × ${away}`;
}

function formatDateBR(utcDate: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(utcDate));
}

export function HeadToHeadPopover({ matchId }: HeadToHeadPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [data, setData] = React.useState<H2HSummary | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (!open || fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    fetchHeadToHeadAction(matchId)
      .then((result) => {
        if (result.ok) {
          setData(result.data);
        } else {
          setErrorMsg(result.error);
        }
      })
      .finally(() => setLoading(false));
  }, [open, matchId]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <History className="h-3.5 w-3.5" aria-hidden />
          Mais detalhes
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <History className="h-3 w-3" aria-hidden />
            Últimos confrontos
          </div>
          {loading && (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Buscando histórico...
            </div>
          )}
          {!loading && errorMsg && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
              {errorMsg}
            </p>
          )}
          {!loading && data && !data.available && (
            <p className="rounded-md border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
              Sem histórico de confrontos diretos disponível neste plano.
            </p>
          )}
          {!loading && data && data.available && data.matches.length === 0 && (
            <p className="rounded-md border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
              Esses dois ainda não se enfrentaram (ou não temos registro).
            </p>
          )}
          {!loading && data && data.available && data.matches.length > 0 && (
            <ul className="space-y-1.5">
              {data.matches.map((match) => (
                <li
                  key={match.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-card/50 p-2 text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium leading-tight">
                      {match.homeName} × {match.awayName}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {match.competitionName} · {formatDateBR(match.utcDate)}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatScore(match.homeScore, match.awayScore)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
