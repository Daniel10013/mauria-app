import { redirect } from "next/navigation";
import { getCurrentProfileResolved } from "@/lib/auth/profile";
import { resolveTeamById } from "@/lib/football/resolver";
import { LEAGUES } from "@/lib/data/leagues";
import { getTeamById } from "@/lib/data/teams";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import type { TeamSuggestion } from "./types";

export const metadata = {
  title: "Configurações — MaurIA",
};

export const dynamic = "force-dynamic";

const VALID_STYLES = ["casual", "analytical", "balanced"] as const;

function asValidStyle(
  raw: string | null | undefined
): "casual" | "analytical" | "balanced" {
  if (raw && (VALID_STYLES as readonly string[]).includes(raw)) {
    return raw as "casual" | "analytical" | "balanced";
  }
  return "balanced";
}

async function resolveWatchedTeam(id: number): Promise<TeamSuggestion> {
  const curated = getTeamById(id);
  const resolved = await resolveTeamById(id);
  if (resolved) {
    return {
      id: resolved.id,
      name: resolved.name,
      shortName: resolved.shortName,
      crest: resolved.crest,
      leagueCode: curated?.leagueCode,
      source: curated ? "curated" : "api",
    };
  }
  if (curated) {
    return {
      id: curated.id,
      name: curated.name,
      shortName: curated.shortName,
      leagueCode: curated.leagueCode,
      source: "curated",
    };
  }
  return {
    id,
    name: `Time ${id}`,
    shortName: `Time ${id}`,
    source: "api",
  };
}

export default async function SettingsPage() {
  const profile = await getCurrentProfileResolved();
  if (!profile) redirect("/login");

  const watchedTeams = await Promise.all(
    profile.watchedTeams.map((id) => resolveWatchedTeam(id))
  );

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 md:py-12">
      <header className="mb-8 space-y-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Configurações
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajuste seu perfil, time, ligas e o que mais o MaurIA fica de olho.
        </p>
      </header>

      <SettingsTabs
        leagues={LEAGUES}
        profile={{
          displayName: profile.displayName ?? "",
          email: profile.email,
          style: asValidStyle(profile.style),
          favoriteTeamId: profile.favoriteTeamId,
          favoriteTeamName: profile.favoriteTeam?.name ?? null,
          favoriteTeamShortName: profile.favoriteTeam?.shortName ?? null,
          favoriteTeamCrest: profile.favoriteTeam?.crest ?? null,
          followedLeagues: profile.followedLeagues,
          watchedTeams,
          watchedPlayers: profile.watchedPlayers,
        }}
      />
    </main>
  );
}
