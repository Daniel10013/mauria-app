import type { Insight } from "@/lib/feed/insights";

interface InsightCardProps {
  insight: Insight;
}

export function InsightCard({ insight }: InsightCardProps) {
  return (
    <article className="flex gap-3 rounded-2xl border border-brand-accent/30 bg-brand-primary/5 p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className="text-2xl leading-none" aria-hidden>
        {insight.icon}
      </span>
      <div className="space-y-1">
        <h3 className="font-display text-sm font-semibold leading-tight">
          {insight.title}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {insight.detail}
        </p>
      </div>
    </article>
  );
}
