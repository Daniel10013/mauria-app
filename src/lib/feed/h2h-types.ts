// Tipos compartilhados pelo popover de Head-to-Head do MatchCard.
// Vivem fora de actions.ts por causa da restrição "use server" (apenas
// async functions podem ser exportadas de lá).

export interface H2HSummaryMatch {
  id: number;
  utcDate: string;
  competitionName: string;
  homeName: string;
  awayName: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface H2HSummary {
  matches: H2HSummaryMatch[];
  available: boolean;
}
