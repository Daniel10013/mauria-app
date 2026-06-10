import { Trophy } from "lucide-react";
import type { FdMatch } from "@/lib/football/types";
import { cn } from "@/lib/utils";
import { MatchCardActions } from "./match-card-actions";

interface MatchCardProps {
  match: FdMatch;
}

const HOUR = 1000 * 60 * 60;
const DAY = HOUR * 24;

function formatWhen(utcDate: string): string {
  const target = new Date(utcDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff < 0) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(utcDate));
  }
  if (diff < HOUR) {
    const mins = Math.max(1, Math.round(diff / (1000 * 60)));
    return `Em ${mins} min`;
  }
  if (diff < DAY) {
    const hours = Math.round(diff / HOUR);
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(utcDate));
    return `Hoje, ${time} (${hours}h)`;
  }
  if (diff < DAY * 2) {
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(utcDate));
    return `Amanhã, ${time}`;
  }
  const days = Math.round(diff / DAY);
  if (days <= 7) {
    return `Daqui a ${days} dias`;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(utcDate));
}

export function MatchCard({ match }: MatchCardProps) {
  const homeName = match.homeTeam.shortName ?? match.homeTeam.name;
  const awayName = match.awayTeam.shortName ?? match.awayTeam.name;
  const askPalpite = `Quem ganha ${homeName} x ${awayName}?`;

  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-accent/50 hover:shadow-md">
      <header className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-1.5 font-semibold">
          <Trophy className="h-3 w-3" aria-hidden />
          {match.competition.name}
        </span>
        <span className="font-medium text-brand-accent/90">
          {formatWhen(match.utcDate)}
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <TeamSide
          name={homeName}
          fullName={match.homeTeam.name}
          crest={match.homeTeam.crest}
          align="left"
          isHome
        />
        <span className="text-xs font-bold text-muted-foreground">VS</span>
        <TeamSide
          name={awayName}
          fullName={match.awayTeam.name}
          crest={match.awayTeam.crest}
          align="right"
          isHome={false}
        />
      </div>

      <MatchCardActions matchId={match.id} question={askPalpite} />
    </article>
  );
}

function TeamSide({
  name,
  fullName,
  crest,
  align,
  isHome,
}: {
  name: string;
  fullName: string;
  crest?: string;
  align: "left" | "right";
  isHome: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        align === "right" && "flex-row-reverse text-right"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40">
        {crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={crest}
            alt={`Escudo do ${fullName}`}
            className="h-7 w-7 object-contain"
          />
        ) : (
          <Trophy className="h-4 w-4 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className={cn("flex flex-col", align === "right" && "items-end")}>
        <span className="text-sm font-semibold leading-tight">{name}</span>
        {isHome && (
          <span className="mt-0.5 inline-flex w-fit rounded-full bg-brand-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-brand-accent">
            Casa
          </span>
        )}
      </div>
    </div>
  );
}
