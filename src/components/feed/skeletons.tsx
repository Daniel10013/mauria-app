export function MatchCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="h-3 w-6 rounded bg-muted" />
        <div className="flex items-center justify-end gap-2">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="h-9 w-9 rounded-full bg-muted" />
        </div>
      </div>
      <div className="mt-3 h-7 w-full rounded bg-muted/60" />
    </div>
  );
}

export function InsightCardSkeleton() {
  return (
    <div className="flex animate-pulse gap-3 rounded-2xl border border-brand-accent/20 bg-brand-primary/5 p-4">
      <div className="h-7 w-7 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

export function SectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}
