"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Team } from "@/lib/data/teams";
import { getLeagueById } from "@/lib/data/leagues";
import { setFavoriteTeamAction } from "../actions";

interface TeamPickerProps {
  teams: Team[];
  initialTeamId: number | null;
}

export function TeamPicker({ teams, initialTeamId }: TeamPickerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(initialTeamId);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.shortName.toLowerCase().includes(query)
    );
  }, [search, teams]);

  function onContinue() {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await setFavoriteTeamAction(selectedId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/onboarding/ligas");
    });
  }

  return (
    <div className="space-y-6">
      <Input
        type="search"
        placeholder="Buscar time..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        aria-label="Buscar time do coração"
      />
      <div
        role="radiogroup"
        aria-label="Times disponíveis"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
      >
        {filtered.map((team) => {
          const league = getLeagueById(team.leagueCode);
          const isSelected = selectedId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedId(team.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-xl border bg-card p-4 text-left transition",
                "hover:border-brand-accent hover:bg-accent/40",
                isSelected
                  ? "border-brand-accent bg-brand-accent/10 ring-2 ring-brand-accent"
                  : "border-border"
              )}
            >
              <span className="text-xs text-muted-foreground">
                {league?.emoji} {league?.name ?? team.leagueCode}
              </span>
              <span className="text-sm font-semibold">{team.shortName}</span>
              <span className="text-xs text-muted-foreground">
                {team.name}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Nenhum time encontrado para “{search}”.
          </p>
        )}
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={onContinue}
          disabled={!selectedId || isPending}
        >
          {isPending ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </div>
  );
}
