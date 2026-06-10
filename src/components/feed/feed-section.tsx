import type { ReactNode, CSSProperties } from "react";
import { Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface FeedSectionProps {
  title: string;
  subtitle?: string;
  emptyText?: string;
  /** Quando true, força layout em coluna única (insights + suggestions). */
  variant?: "grid" | "stack";
  children: ReactNode;
}

const STAGGER_MS = 50;

interface ChildAttrs {
  className?: string;
  style?: CSSProperties;
}

function withStagger(children: ReactNode): ReactNode[] {
  return Children.toArray(children)
    .filter(isValidElement)
    .map((child, index) => {
      const element = child as React.ReactElement<ChildAttrs>;
      const previousClassName = element.props.className ?? "";
      const previousStyle = element.props.style ?? {};
      return cloneElement(element, {
        className: cn("animate-fade-in", previousClassName),
        style: {
          ...previousStyle,
          animationDelay: `${index * STAGGER_MS}ms`,
        },
      });
    });
}

export function FeedSection({
  title,
  subtitle,
  emptyText = "Nada por aqui ainda.",
  variant = "grid",
  children,
}: FeedSectionProps) {
  const childrenArray = Children.toArray(children).filter(isValidElement);
  const isEmpty = childrenArray.length === 0;
  const animated = isEmpty ? [] : withStagger(children);

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </header>
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : variant === "grid" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {animated}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{animated}</div>
      )}
    </section>
  );
}
