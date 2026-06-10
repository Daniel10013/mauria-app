"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trophy, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { League } from "@/lib/data/leagues";
import { updateProfileAction } from "@/app/(app)/settings/actions";
import type { TeamSuggestion } from "@/app/(app)/settings/types";
import { TeamSearchDialog } from "./team-search-dialog";

interface RadarTabProps {
  leagues: League[];
  initial: {
    followedLeagues: string[];
    watchedTeams: TeamSuggestion[];
    watchedPlayers: string[];
    favoriteTeamId: number | null;
  };
}

const MAX_TEAMS = 10;
const MAX_PLAYERS = 10;

export function RadarTab({ leagues, initial }: RadarTabProps) {
  const router = useRouter();

  const [followedLeagues, setFollowedLeagues] = React.useState<Set<string>>(
    () => new Set(initial.followedLeagues)
  );
  const [savingLeagues, startSaveLeagues] = React.useTransition();

  const [teams, setTeams] = React.useState<TeamSuggestion[]>(initial.watchedTeams);
  const [savingTeams, startSaveTeams] = React.useTransition();
  const [teamDialogOpen, setTeamDialogOpen] = React.useState(false);

  const [players, setPlayers] = React.useState<string[]>(initial.watchedPlayers);
  const [playerInput, setPlayerInput] = React.useState("");
  const [savingPlayers, startSavePlayers] = React.useTransition();

  function persistLeagues(next: Set<string>) {
    const ids = Array.from(next);
    if (ids.length === 0) {
      toast.error("Mantenha pelo menos uma liga.");
      return;
    }
    startSaveLeagues(async () => {
      const result = await updateProfileAction({ followedLeagues: ids });
      if (!result.ok) {
        toast.error(result.error);
        setFollowedLeagues(new Set(initial.followedLeagues));
        return;
      }
      toast.success("Ligas atualizadas.");
      router.refresh();
    });
  }

  function toggleLeague(id: string) {
    setFollowedLeagues((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistLeagues(next);
      return next;
    });
  }

  function persistTeams(next: TeamSuggestion[]) {
    startSaveTeams(async () => {
      const result = await updateProfileAction({
        watchedTeams: next.map((t) => t.id),
      });
      if (!result.ok) {
        toast.error(result.error);
        setTeams(initial.watchedTeams);
        return;
      }
      toast.success("Radar de times atualizado.");
      router.refresh();
    });
  }

  function addTeam(team: TeamSuggestion) {
    if (teams.length >= MAX_TEAMS) {
      toast.error(`Máximo de ${MAX_TEAMS} times no radar.`);
      return;
    }
    if (teams.some((t) => t.id === team.id)) {
      toast.info("Esse time já está no radar.");
      return;
    }
    const next = [...teams, team];
    setTeams(next);
    setTeamDialogOpen(false);
    persistTeams(next);
  }

  function removeTeam(teamId: number) {
    const next = teams.filter((t) => t.id !== teamId);
    setTeams(next);
    persistTeams(next);
  }

  function persistPlayers(next: string[]) {
    startSavePlayers(async () => {
      const result = await updateProfileAction({ watchedPlayers: next });
      if (!result.ok) {
        toast.error(result.error);
        setPlayers(initial.watchedPlayers);
        return;
      }
      router.refresh();
    });
  }

  function addPlayer() {
    const trimmed = playerInput.trim();
    if (trimmed.length < 2) {
      toast.error("Nome muito curto.");
      return;
    }
    if (trimmed.length > 40) {
      toast.error("Nome muito longo.");
      return;
    }
    if (players.length >= MAX_PLAYERS) {
      toast.error(`Máximo de ${MAX_PLAYERS} jogadores no radar.`);
      return;
    }
    if (
      players.some((p) => p.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.info("Esse jogador já está no radar.");
      return;
    }
    const next = [...players, trimmed];
    setPlayers(next);
    setPlayerInput("");
    persistPlayers(next);
  }

  function removePlayer(name: string) {
    const next = players.filter((p) => p !== name);
    setPlayers(next);
    persistPlayers(next);
  }

  function onPlayerKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addPlayer();
    }
  }

  const excludeIds = React.useMemo(
    () => [
      ...(initial.favoriteTeamId !== null ? [initial.favoriteTeamId] : []),
      ...teams.map((t) => t.id),
    ],
    [initial.favoriteTeamId, teams]
  );

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <div className="space-y-1">
          <Label>Ligas que sigo</Label>
          <p className="text-xs text-muted-foreground">
            Aparecem no feed e nas previsões. Mínimo 1.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {leagues.map((league) => {
            const selected = followedLeagues.has(league.id);
            return (
              <button
                key={league.id}
                type="button"
                onClick={() => toggleLeague(league.id)}
                disabled={savingLeagues}
                aria-pressed={selected}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  selected
                    ? "border-brand-accent bg-brand-accent/15 text-brand-accent"
                    : "border-border bg-card text-foreground hover:border-brand-accent/50"
                )}
              >
                <span aria-hidden>{league.emoji}</span>
                <span>{league.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div className="space-y-1">
            <Label>Times no radar</Label>
            <p className="text-xs text-muted-foreground">
              Adicione até {MAX_TEAMS} times além do favorito. Eu fico de olho
              neles também.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTeamDialogOpen(true)}
            disabled={savingTeams || teams.length >= MAX_TEAMS}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Adicionar
          </Button>
        </div>
        {teams.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            Nenhum time no radar ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted/40">
                    {team.crest ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.crest}
                        alt=""
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <Trophy
                        className="h-4 w-4 text-muted-foreground"
                        aria-hidden
                      />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium leading-tight">
                      {team.shortName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {team.name}
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeTeam(team.id)}
                  disabled={savingTeams}
                  aria-label={`Remover ${team.shortName} do radar`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <Label>Jogadores no radar</Label>
          <p className="text-xs text-muted-foreground">
            Texto livre por enquanto. Aperte Enter pra adicionar. Até{" "}
            {MAX_PLAYERS} jogadores.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={playerInput}
            onChange={(event) => setPlayerInput(event.target.value)}
            onKeyDown={onPlayerKey}
            placeholder="Ex.: Vinicius Jr"
            disabled={savingPlayers || players.length >= MAX_PLAYERS}
            maxLength={40}
          />
          <Button
            type="button"
            onClick={addPlayer}
            disabled={savingPlayers || players.length >= MAX_PLAYERS}
          >
            {savingPlayers ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              "Adicionar"
            )}
          </Button>
        </div>
        {players.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {players.map((player) => (
              <li key={player}>
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 text-xs font-medium"
                >
                  {player}
                  <button
                    type="button"
                    onClick={() => removePlayer(player)}
                    disabled={savingPlayers}
                    className="rounded-full p-0.5 transition-colors hover:bg-background/40"
                    aria-label={`Remover ${player} do radar`}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <TeamSearchDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        title="Adicionar time ao radar"
        description="Esses times entram no contexto do MaurIA além do seu favorito."
        excludeIds={excludeIds}
        onSelect={addTeam}
      />
    </div>
  );
}
