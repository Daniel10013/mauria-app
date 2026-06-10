import { Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PredictionCardData } from "@/lib/prediction/card";

interface PredictionCardProps {
  card: PredictionCardData;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function formChips(home: number, away: number): string {
  return `${pct(home)} ↔ ${pct(away)}`;
}

export function PredictionCard({ card }: PredictionCardProps) {
  const { probabilities, factors, homeAdvantage } = card;
  const homeWinning =
    probabilities.home >= probabilities.away &&
    probabilities.home >= probabilities.draw;
  const awayWinning =
    probabilities.away > probabilities.home &&
    probabilities.away >= probabilities.draw;

  const hasH2H =
    factors.h2h.winsHome + factors.h2h.draws + factors.h2h.winsAway > 0;

  return (
    <div className="rounded-2xl border border-brand-accent/40 bg-card/95 p-4 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-accent/40 bg-brand-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-accent">
          <Sparkles className="h-3 w-3" />
          Previsão MaurIA
        </span>
      </header>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamSide
          name={card.home.shortName}
          fullName={card.home.name}
          homeBadge={homeAdvantage === "A" || homeAdvantage === "B"}
          align="left"
          highlight={homeWinning}
        />
        <span className="text-xs font-bold text-muted-foreground">VS</span>
        <TeamSide
          name={card.away.shortName}
          fullName={card.away.name}
          homeBadge={false}
          align="right"
          highlight={awayWinning}
        />
      </div>

      <div className="mt-4 space-y-2">
        <ProbabilityBar
          label={card.home.shortName}
          value={probabilities.home}
          tone="primary"
          highlight={homeWinning}
        />
        <ProbabilityBar
          label="Empate"
          value={probabilities.draw}
          tone="muted"
          highlight={
            !homeWinning && !awayWinning
          }
        />
        <ProbabilityBar
          label={card.away.shortName}
          value={probabilities.away}
          tone="accent"
          highlight={awayWinning}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5 text-[11px]">
        <FactorChip
          icon="📊"
          label="Forma"
          detail={formChips(factors.formHomePct, factors.formAwayPct)}
        />
        {hasH2H && (
          <FactorChip
            icon="🆚"
            label="H2H"
            detail={`${card.home.shortName} ${factors.h2h.winsHome} · E ${factors.h2h.draws} · ${card.away.shortName} ${factors.h2h.winsAway}`}
          />
        )}
        <FactorChip
          icon="🏟️"
          label="Mando"
          detail={
            homeAdvantage === "neutral"
              ? "neutro"
              : `${homeAdvantage === "A" ? card.home.shortName : card.away.shortName} em casa`
          }
        />
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground">
        Análise baseada em dados — futebol é imprevisível.
      </p>
    </div>
  );
}

function TeamSide({
  name,
  fullName,
  homeBadge,
  align,
  highlight,
}: {
  name: string;
  fullName: string;
  homeBadge: boolean;
  align: "left" | "right";
  highlight: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        align === "right" && "items-end text-right"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-full border bg-muted/40",
            highlight
              ? "border-brand-accent/70 text-brand-accent"
              : "border-border text-muted-foreground"
          )}
          aria-hidden
        >
          <Trophy className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold">{name}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">{fullName}</span>
      {homeBadge && (
        <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-brand-primary/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-brand-accent">
          Casa
        </span>
      )}
    </div>
  );
}

function ProbabilityBar({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: number;
  tone: "primary" | "muted" | "accent";
  highlight: boolean;
}) {
  const widthPct = `${Math.max(2, Math.round(value * 100))}%`;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span
          className={cn(
            "font-medium",
            highlight ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "tabular-nums",
            highlight ? "font-bold text-brand-accent" : "text-muted-foreground"
          )}
        >
          {pct(value)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "primary" && "bg-brand-secondary",
            tone === "accent" && "bg-blue-500/80",
            tone === "muted" && "bg-muted-foreground/50"
          )}
          style={{ width: widthPct }}
        />
      </div>
    </div>
  );
}

function FactorChip({
  icon,
  label,
  detail,
}: {
  icon: string;
  label: string;
  detail: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5">
      <span aria-hidden>{icon}</span>
      <span className="font-medium text-foreground">{label}:</span>
      <span className="text-muted-foreground">{detail}</span>
    </span>
  );
}
