import { redirect } from "next/navigation";
import { LeaguePicker } from "./league-picker";
import { LEAGUES } from "@/lib/data/leagues";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getTeamById } from "@/lib/data/teams";

export const metadata = {
  title: "Ligas seguidas — MaurIA",
};

export default async function OnboardingLigasPage() {
  const profile = await getCurrentProfile();
  if (!profile?.favoriteTeamId) {
    redirect("/onboarding/time");
  }

  const team = getTeamById(profile.favoriteTeamId);
  const presetLeague = team?.leagueCode;
  const initialSelection =
    profile.followedLeagues.length > 0
      ? profile.followedLeagues
      : presetLeague
        ? [presetLeague]
        : [];

  return (
    <LeaguePicker
      leagues={LEAGUES}
      initialSelection={initialSelection}
      teamShortName={team?.shortName ?? null}
    />
  );
}
