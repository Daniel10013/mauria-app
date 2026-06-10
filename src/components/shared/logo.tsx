import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-xl font-extrabold tracking-tight",
        className
      )}
    >
      Maur<span className="text-brand-accent">IA</span>
    </span>
  );
}
