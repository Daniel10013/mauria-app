"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER = ["light", "dark", "system"] as const;

type ThemeMode = (typeof ORDER)[number];

const LABELS: Record<ThemeMode, string> = {
  light: "Tema claro",
  dark: "Tema escuro",
  system: "Tema do sistema",
};

const NEXT_LABEL: Record<ThemeMode, string> = {
  light: "Mudar para tema escuro",
  dark: "Mudar para tema do sistema",
  system: "Mudar para tema claro",
};

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Antes de hidratar, evita flicker mostrando ícone neutro estático.
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        aria-label="Carregando preferência de tema"
        className="h-9 w-9 text-muted-foreground"
        disabled
      >
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  const current = (theme ?? "system") as ThemeMode;
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] as ThemeMode;

  function cycle() {
    setTheme(next);
  }

  function Icon() {
    if (current === "system") return <Monitor className="h-4 w-4" />;
    const effective = current === "light" ? "light" : "dark";
    if (effective === "light" || resolvedTheme === "light") {
      return <Sun className="h-4 w-4" />;
    }
    return <Moon className="h-4 w-4" />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      title={`${LABELS[current]} — ${NEXT_LABEL[current]}`}
      aria-label={NEXT_LABEL[current]}
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
    >
      <Icon />
    </Button>
  );
}
