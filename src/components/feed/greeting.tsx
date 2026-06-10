import type { ResolvedProfile } from "@/lib/auth/profile";
import type { FdMatch } from "@/lib/football/types";

interface GreetingProps {
  profile: ResolvedProfile;
  upcomingMatches: FdMatch[];
}

const FALLBACK_LINES = [
  "Tô ligado nos jogos. Bora conversar?",
  "Cheirinho de bola rolando por aí.",
  "Hoje a tabela tá quente — confere o que separei pra você.",
  "Olha esse feed: dados frescos, sem firula.",
];

function timeBasedGreeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function pickContextLine(
  profile: ResolvedProfile,
  upcoming: FdMatch[]
): string {
  const fav = profile.favoriteTeam;
  if (fav) {
    const todayUtc = new Date();
    const today = todayUtc.toISOString().slice(0, 10);
    const todaysMatch = upcoming.find((m) => {
      const matchDate = m.utcDate.slice(0, 10);
      const involvesFav =
        m.homeTeam.id === fav.id || m.awayTeam.id === fav.id;
      return involvesFav && matchDate === today;
    });
    if (todaysMatch) {
      const opp =
        todaysMatch.homeTeam.id === fav.id
          ? todaysMatch.awayTeam.shortName ?? todaysMatch.awayTeam.name
          : todaysMatch.homeTeam.shortName ?? todaysMatch.homeTeam.name;
      return `Tem jogo do ${fav.shortName} hoje contra o ${opp}!`;
    }
    const nextOfFav = upcoming.find(
      (m) => m.homeTeam.id === fav.id || m.awayTeam.id === fav.id
    );
    if (nextOfFav) {
      return `Próximo jogo do ${fav.shortName} já tá no feed.`;
    }
    return `Sem jogo do ${fav.shortName} no horizonte. A bola corre nas outras ligas.`;
  }
  // Sem favorito: fallback rotativo determinístico por hora.
  const idx = new Date().getHours() % FALLBACK_LINES.length;
  return FALLBACK_LINES[idx]!;
}

function getDisplayName(profile: ResolvedProfile): string {
  return (
    profile.displayName?.split(" ")[0] ||
    profile.email?.split("@")[0] ||
    "torcedor"
  );
}

export function Greeting({ profile, upcomingMatches }: GreetingProps) {
  const greet = timeBasedGreeting(new Date());
  const name = getDisplayName(profile);

  return (
    <header className="space-y-2">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
        {greet}, {name}!
      </h1>
      <p className="text-sm text-muted-foreground md:text-base">
        {pickContextLine(profile, upcomingMatches)}
      </p>
    </header>
  );
}

/**
 * Versão estática usada como fallback do Suspense enquanto o feed carrega.
 * Mostra título + frase neutra; assim que o `Greeting` "completo" entra no
 * lugar, a frase contextual com base nos jogos é exibida sem flicker do
 * título.
 */
export function GreetingFallback({ profile }: { profile: ResolvedProfile }) {
  const greet = timeBasedGreeting(new Date());
  const name = getDisplayName(profile);

  return (
    <header className="space-y-2">
      <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
        {greet}, {name}!
      </h1>
      <p className="text-sm text-muted-foreground md:text-base">
        Buscando o que tá pegando…
      </p>
    </header>
  );
}
