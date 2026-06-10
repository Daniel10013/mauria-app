"use client";

import * as React from "react";
import { Loader2, Search, Trophy } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { searchTeamAction } from "@/app/(app)/settings/actions";
import type { TeamSuggestion } from "@/app/(app)/settings/types";

interface TeamSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** IDs já em uso (favorito + radar) para desabilitar opções duplicadas. */
  excludeIds?: number[];
  onSelect: (team: TeamSuggestion) => void | Promise<void>;
}

const SEARCH_DEBOUNCE_MS = 300;

export function TeamSearchDialog({
  open,
  onOpenChange,
  title,
  description,
  excludeIds = [],
  onSelect,
}: TeamSearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<TeamSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const excludeSet = React.useMemo(
    () => new Set(excludeIds),
    [excludeIds]
  );

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
    }
  }, [open]);

  React.useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      const result = await searchTeamAction(trimmed);
      if (!result.ok) {
        toast.error(result.error);
        setResults([]);
        setLoading(false);
        return;
      }
      setResults(result.data);
      setLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              type="search"
              placeholder="Digite ao menos 2 letras..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              aria-label="Buscar time"
            />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border/50 bg-card/40 p-1">
            {loading && (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Procurando...
              </div>
            )}
            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Nenhum time encontrado pra “{query.trim()}”.
              </div>
            )}
            {!loading && query.trim().length < 2 && (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Comece a digitar pra ver opções.
              </div>
            )}
            {!loading &&
              results.map((team) => {
                const disabled = excludeSet.has(team.id);
                return (
                  <button
                    key={team.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (disabled) return;
                      void onSelect(team);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40">
                        {team.crest ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={team.crest}
                            alt=""
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <Trophy
                            className="h-3.5 w-3.5 text-muted-foreground"
                            aria-hidden
                          />
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-tight">
                          {team.shortName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {team.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {team.leagueCode && (
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {team.leagueCode}
                        </span>
                      )}
                      {team.source === "api" && (
                        <Badge variant="outline" className="text-[9px]">
                          via API
                        </Badge>
                      )}
                      {disabled && (
                        <span className="text-[10px] text-muted-foreground">
                          já selecionado
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
          <p className="text-xs text-muted-foreground">
            Times marcados como “via API” são buscados na Football-Data.org. A
            disponibilidade pode variar.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
