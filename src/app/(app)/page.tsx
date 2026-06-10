import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  getCurrentProfileResolved,
  type ResolvedProfile,
} from "@/lib/auth/profile";
import { getCachedFeed } from "@/lib/feed/cache";
import { Greeting, GreetingFallback } from "@/components/feed/greeting";
import { FeedSection } from "@/components/feed/feed-section";
import { MatchCard } from "@/components/feed/match-card";
import { InsightCard } from "@/components/feed/insight-card";
import { SuggestionCard } from "@/components/feed/suggestion-card";
import {
  InsightCardSkeleton,
  SectionSkeleton,
} from "@/components/feed/skeletons";
import { FeedLoadingPhrase } from "@/components/feed/loading-phrase";
import { RefreshButton } from "@/components/feed/refresh-button";

export const metadata = {
  title: "Home — MaurIA",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await getCurrentProfileResolved();
  if (!profile) redirect("/login");

  return (
    <main className="container mx-auto max-w-6xl space-y-10 px-4 py-10 md:py-12">
      <div className="flex justify-end">
        <RefreshButton />
      </div>

      <Suspense fallback={<HomeFallback profile={profile} />}>
        <FeedContent profile={profile} />
      </Suspense>
    </main>
  );
}

async function FeedContent({ profile }: { profile: ResolvedProfile }) {
  const feed = await getCachedFeed(profile.id);

  return (
    <div className="space-y-12">
      <Greeting profile={profile} upcomingMatches={feed.upcomingMatches} />

      {feed.partial && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Tá demorando pra carregar alguns jogos. Tenta de novo em uns
            minutinhos.
          </span>
        </div>
      )}

      <FeedSection
        title="Próximos jogos pra você"
        subtitle="Selecionados a partir do seu time e ligas"
        emptyText="Sem jogos no horizonte dos seus times. Adiciona ligas em Configurações pra ampliar o radar."
      >
        {feed.upcomingMatches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </FeedSection>

      <FeedSection
        title="Acontecendo no seu radar"
        subtitle="Sequências, líderes e fatos extraídos dos dados"
        variant="stack"
        emptyText="Vou ficar de olho. Em breve aparece coisa boa aqui."
      >
        {feed.insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </FeedSection>

      <FeedSection
        title="Pergunte ao MaurIA"
        subtitle="Sugestões pra começar uma conversa"
        variant="stack"
      >
        {feed.suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </FeedSection>
    </div>
  );
}

function HomeFallback({ profile }: { profile: ResolvedProfile }) {
  return (
    <div className="space-y-12">
      <GreetingFallback profile={profile} />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-7 w-64 animate-pulse rounded bg-muted" />
          <FeedLoadingPhrase />
        </div>
        <SectionSkeleton count={3} />
      </section>
      <section className="space-y-4">
        <div className="h-7 w-56 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <InsightCardSkeleton />
          <InsightCardSkeleton />
          <InsightCardSkeleton />
        </div>
      </section>
    </div>
  );
}
