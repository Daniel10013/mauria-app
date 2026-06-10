import { redirect } from "next/navigation";
import { Logo } from "@/components/shared/logo";
import { getCurrentProfile } from "@/lib/auth/profile";
import { getTeamById } from "@/lib/data/teams";
import { getLeagueById } from "@/lib/data/leagues";
import { ChatWelcome } from "./chat-welcome";

export const metadata = {
  title: "Conversas — MaurIA",
};

export default async function ChatHomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const team = profile.favoriteTeamId
    ? getTeamById(profile.favoriteTeamId)
    : null;
  const firstLeague = profile.followedLeagues[0]
    ? getLeagueById(profile.followedLeagues[0])
    : null;

  const suggestions = [
    team
      ? `Como tá o ${team.shortName} esse ano?`
      : "Quem é o time mais bem montado pra essa temporada?",
    firstLeague
      ? `Quem lidera a ${firstLeague.name}?`
      : "Quem lidera a Premier League?",
    "Quem ganha o próximo clássico inglês?",
    "Me conta uma história legal da Champions",
  ];

  return (
    <main className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-8 text-center">
      <Logo className="text-4xl md:text-5xl" />
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
        Sobre o que vamos falar hoje?
      </h1>
      <ChatWelcome suggestions={suggestions} />
    </main>
  );
}
