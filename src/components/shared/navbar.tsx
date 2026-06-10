import Link from "next/link";
import type { Profile } from "@prisma/client";
import { Logo } from "@/components/shared/logo";
import { UserMenu } from "@/components/shared/user-menu";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  profile?: Profile;
}

const isDev = process.env.NODE_ENV === "development";

export function Navbar({ profile }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          aria-label="Página inicial da MaurIA"
          className="flex items-center"
        >
          <Logo />
        </Link>
        <nav className="flex items-center gap-3">
          {profile && (
            <Link
              href="/chat"
              className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
            >
              Conversas
            </Link>
          )}
          {isDev && profile && (
            <Link
              href="/dev/playground"
              className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              dev
            </Link>
          )}
          <ThemeToggle />
          {profile ? (
            <UserMenu profile={profile} />
          ) : (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
