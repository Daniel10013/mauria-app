// Tipos compartilhados entre Server Actions e componentes Client.
// Arquivos com "use server" só podem exportar async functions, então tipos
// vivem aqui.

export interface TeamSuggestion {
  id: number;
  name: string;
  shortName: string;
  crest?: string;
  leagueCode?: string;
  source: "curated" | "api";
}
