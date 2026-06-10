"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { League } from "@/lib/data/leagues";
import { ProfileTab } from "./profile-tab";
import { FavoriteTeamTab } from "./favorite-team-tab";
import { RadarTab } from "./radar-tab";
import { AccountTab } from "./account-tab";
import type { TeamSuggestion } from "@/app/(app)/settings/types";

interface SettingsTabsProps {
  leagues: League[];
  profile: {
    displayName: string;
    email: string;
    style: "casual" | "analytical" | "balanced";
    favoriteTeamId: number | null;
    favoriteTeamName: string | null;
    favoriteTeamShortName: string | null;
    favoriteTeamCrest: string | null;
    followedLeagues: string[];
    watchedTeams: TeamSuggestion[];
    watchedPlayers: string[];
  };
}

export function SettingsTabs({ leagues, profile }: SettingsTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="flex w-full flex-wrap">
        <TabsTrigger value="profile" className="flex-1">
          Perfil
        </TabsTrigger>
        <TabsTrigger value="team" className="flex-1">
          Time
        </TabsTrigger>
        <TabsTrigger value="radar" className="flex-1">
          Radar
        </TabsTrigger>
        <TabsTrigger value="account" className="flex-1">
          Conta
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="pt-6">
        <ProfileTab
          initial={{
            displayName: profile.displayName,
            email: profile.email,
            style: profile.style,
          }}
        />
      </TabsContent>
      <TabsContent value="team" className="pt-6">
        <FavoriteTeamTab
          initial={{
            favoriteTeamId: profile.favoriteTeamId,
            favoriteTeamName: profile.favoriteTeamName,
            favoriteTeamShortName: profile.favoriteTeamShortName,
            favoriteTeamCrest: profile.favoriteTeamCrest,
          }}
          excludeIds={profile.watchedTeams.map((t) => t.id)}
        />
      </TabsContent>
      <TabsContent value="radar" className="pt-6">
        <RadarTab
          leagues={leagues}
          initial={{
            followedLeagues: profile.followedLeagues,
            watchedTeams: profile.watchedTeams,
            watchedPlayers: profile.watchedPlayers,
            favoriteTeamId: profile.favoriteTeamId,
          }}
        />
      </TabsContent>
      <TabsContent value="account" className="pt-6">
        <AccountTab />
      </TabsContent>
    </Tabs>
  );
}
