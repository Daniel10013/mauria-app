"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateProfileAction } from "@/app/(app)/settings/actions";
import type { TeamSuggestion } from "@/app/(app)/settings/types";
import { TeamSearchDialog } from "./team-search-dialog";

interface FavoriteTeamTabProps {
  initial: {
    favoriteTeamId: number | null;
    favoriteTeamName: string | null;
    favoriteTeamShortName: string | null;
    favoriteTeamCrest: string | null;
  };
  excludeIds: number[];
}

export function FavoriteTeamTab({
  initial,
  excludeIds,
}: FavoriteTeamTabProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function onSelectTeam(team: TeamSuggestion) {
    startTransition(async () => {
      const result = await updateProfileAction({ favoriteTeamId: team.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Agora seu time é o ${team.shortName}.`);
      setOpen(false);
      router.refresh();
    });
  }

  const hasFavorite = initial.favoriteTeamId !== null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/40">
            {initial.favoriteTeamCrest ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={initial.favoriteTeamCrest}
                alt={`Escudo do ${initial.favoriteTeamName ?? "time"}`}
                className="h-10 w-10 object-contain"
              />
            ) : (
              <Trophy
                className="h-6 w-6 text-muted-foreground"
                aria-hidden
              />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Time do coração
            </p>
            <p className="font-display text-xl font-bold leading-tight">
              {hasFavorite
                ? initial.favoriteTeamShortName ?? initial.favoriteTeamName
                : "Nenhum time selecionado"}
            </p>
            {hasFavorite && initial.favoriteTeamName && (
              <p className="text-xs text-muted-foreground">
                {initial.favoriteTeamName}
              </p>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(true)}
          disabled={pending}
        >
          <Pencil className="h-4 w-4" aria-hidden />
          {hasFavorite ? "Trocar time" : "Escolher time"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tudo que o MaurIA mostra na home e nas respostas é personalizado a
        partir do seu time. Trocar aqui atualiza o feed automaticamente.
      </p>

      <TeamSearchDialog
        open={open}
        onOpenChange={setOpen}
        title="Trocar time do coração"
        description="Busque pelo nome ou apelido. A lista curada vem primeiro; complementamos via Football-Data."
        excludeIds={excludeIds}
        onSelect={onSelectTeam}
      />
    </div>
  );
}
