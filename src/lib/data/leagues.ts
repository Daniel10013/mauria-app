// Lista curada de competições suportadas no MVP.
//
// IDs e códigos seguem a Football-Data.org v4 quando disponíveis. Para as
// competições sul-americanas e Copa do Brasil, a Football-Data.org não expõe
// IDs públicos no plano gratuito — usamos os códigos como identificadores
// (string), por isso o tipo de `id` é `string` em todo o app (ver
// followedLeagues no schema do Profile, também `String[]`).
//
// Quando a tela de configurações (milestone 06) integrar busca via API, vamos
// reconciliar com os IDs reais quando aplicável.

export type LeagueId = string;

export interface League {
  /** Identificador estável usado no banco (string sempre). */
  id: LeagueId;
  /** Código curto da Football-Data.org. */
  code: string;
  /** Id numérico oficial (quando existir no plano free). */
  numericId: number | null;
  name: string;
  country: string;
  emoji: string;
}

export const LEAGUES: League[] = [
  {
    id: "PL",
    code: "PL",
    numericId: 2021,
    name: "Premier League",
    country: "Inglaterra",
    emoji: "🇬🇧",
  },
  {
    id: "PD",
    code: "PD",
    numericId: 2014,
    name: "La Liga",
    country: "Espanha",
    emoji: "🇪🇸",
  },
  {
    id: "SA",
    code: "SA",
    numericId: 2019,
    name: "Serie A",
    country: "Itália",
    emoji: "🇮🇹",
  },
  {
    id: "BL1",
    code: "BL1",
    numericId: 2002,
    name: "Bundesliga",
    country: "Alemanha",
    emoji: "🇩🇪",
  },
  {
    id: "FL1",
    code: "FL1",
    numericId: 2015,
    name: "Ligue 1",
    country: "França",
    emoji: "🇫🇷",
  },
  {
    id: "BSA",
    code: "BSA",
    numericId: 2013,
    name: "Brasileirão Série A",
    country: "Brasil",
    emoji: "🇧🇷",
  },
  {
    id: "CL",
    code: "CL",
    numericId: 2001,
    name: "UEFA Champions League",
    country: "Europa",
    emoji: "🏆",
  },
  {
    id: "EC",
    code: "EC",
    numericId: 2018,
    name: "Eurocopa",
    country: "Europa",
    emoji: "🌍",
  },
  {
    id: "WC",
    code: "WC",
    numericId: 2000,
    name: "Copa do Mundo",
    country: "Mundial",
    emoji: "🌐",
  },
  {
    id: "CLI",
    code: "CLI",
    numericId: null,
    name: "Copa Libertadores",
    country: "América do Sul",
    emoji: "🥇",
  },
  {
    id: "CSA",
    code: "CSA",
    numericId: null,
    name: "Copa Sul-Americana",
    country: "América do Sul",
    emoji: "🥈",
  },
  {
    id: "CB",
    code: "CB",
    numericId: null,
    name: "Copa do Brasil",
    country: "Brasil",
    emoji: "🇧🇷",
  },
];

export const LEAGUE_IDS = new Set(LEAGUES.map((l) => l.id));

export function getLeagueById(id: string): League | undefined {
  return LEAGUES.find((l) => l.id === id);
}
