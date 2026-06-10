import { TeamPicker } from "./team-picker";
import { TEAMS } from "@/lib/data/teams";
import { getCurrentProfile } from "@/lib/auth/profile";

export const metadata = {
  title: "Time do coração — MaurIA",
};

export default async function OnboardingTimePage() {
  const profile = await getCurrentProfile();
  return (
    <TeamPicker
      teams={TEAMS}
      initialTeamId={profile?.favoriteTeamId ?? null}
    />
  );
}
