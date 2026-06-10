// Lista curada de times populares para o onboarding (milestone 02).
//
// IDs vêm da Football-Data.org v4 (plano free). Onde existe dúvida, marcamos
// `confirmed: false` para que a tela de configurações (milestone 06) possa
// reconciliar via API. A busca de times além desta lista também entra lá.

export interface Team {
  id: number;
  name: string;
  shortName: string;
  leagueCode: string;
  /** Marca times com id ainda não confirmado pelo agente. */
  confirmed?: boolean;
}

export const TEAMS: Team[] = [
  // Premier League
  { id: 65, name: "Manchester City", shortName: "Man City", leagueCode: "PL" },
  { id: 64, name: "Liverpool FC", shortName: "Liverpool", leagueCode: "PL" },
  { id: 57, name: "Arsenal FC", shortName: "Arsenal", leagueCode: "PL" },
  {
    id: 66,
    name: "Manchester United",
    shortName: "Man United",
    leagueCode: "PL",
  },
  { id: 61, name: "Chelsea FC", shortName: "Chelsea", leagueCode: "PL" },
  { id: 73, name: "Tottenham Hotspur", shortName: "Tottenham", leagueCode: "PL" },
  { id: 58, name: "Aston Villa", shortName: "Aston Villa", leagueCode: "PL" },
  { id: 67, name: "Newcastle United", shortName: "Newcastle", leagueCode: "PL" },

  // La Liga
  { id: 86, name: "Real Madrid", shortName: "Real Madrid", leagueCode: "PD" },
  { id: 81, name: "FC Barcelona", shortName: "Barcelona", leagueCode: "PD" },
  {
    id: 78,
    name: "Atlético de Madrid",
    shortName: "Atlético",
    leagueCode: "PD",
  },
  { id: 95, name: "Valencia CF", shortName: "Valencia", leagueCode: "PD" },
  { id: 559, name: "Sevilla FC", shortName: "Sevilla", leagueCode: "PD" },

  // Serie A
  { id: 108, name: "Internazionale", shortName: "Inter", leagueCode: "SA" },
  { id: 98, name: "AC Milan", shortName: "Milan", leagueCode: "SA" },
  { id: 109, name: "Juventus FC", shortName: "Juventus", leagueCode: "SA" },
  { id: 113, name: "SSC Napoli", shortName: "Napoli", leagueCode: "SA" },
  { id: 100, name: "AS Roma", shortName: "Roma", leagueCode: "SA" },
  { id: 110, name: "Lazio", shortName: "Lazio", leagueCode: "SA" },

  // Bundesliga
  {
    id: 5,
    name: "Bayern de Munique",
    shortName: "Bayern",
    leagueCode: "BL1",
  },
  {
    id: 4,
    name: "Borussia Dortmund",
    shortName: "Dortmund",
    leagueCode: "BL1",
  },
  {
    id: 3,
    name: "Bayer Leverkusen",
    shortName: "Leverkusen",
    leagueCode: "BL1",
  },
  { id: 11, name: "VfB Stuttgart", shortName: "Stuttgart", leagueCode: "BL1" },
  { id: 19, name: "Eintracht Frankfurt", shortName: "Frankfurt", leagueCode: "BL1" },

  // Ligue 1
  { id: 524, name: "Paris Saint-Germain", shortName: "PSG", leagueCode: "FL1" },
  {
    id: 516,
    name: "Olympique de Marseille",
    shortName: "Marseille",
    leagueCode: "FL1",
  },
  {
    id: 523,
    name: "Olympique Lyonnais",
    shortName: "Lyon",
    leagueCode: "FL1",
  },
  { id: 548, name: "AS Monaco", shortName: "Monaco", leagueCode: "FL1" },

  // Brasileirão Série A — IDs reconciliados via GET /v4/competitions/BSA/teams
  // (Football-Data.org). Lista corresponde aos 20 clubes da temporada atual.
  // `confirmed: true` indica que o ID foi validado contra a API.
  { id: 1783, name: "Flamengo", shortName: "Flamengo", leagueCode: "BSA", confirmed: true },
  { id: 1769, name: "Palmeiras", shortName: "Palmeiras", leagueCode: "BSA", confirmed: true },
  { id: 1779, name: "Corinthians", shortName: "Corinthians", leagueCode: "BSA", confirmed: true },
  { id: 1776, name: "São Paulo", shortName: "São Paulo", leagueCode: "BSA", confirmed: true },
  { id: 1765, name: "Fluminense", shortName: "Fluminense", leagueCode: "BSA", confirmed: true },
  { id: 1780, name: "Vasco da Gama", shortName: "Vasco", leagueCode: "BSA", confirmed: true },
  { id: 1770, name: "Botafogo", shortName: "Botafogo", leagueCode: "BSA", confirmed: true },
  { id: 1771, name: "Cruzeiro", shortName: "Cruzeiro", leagueCode: "BSA", confirmed: true },
  { id: 1766, name: "Atlético Mineiro", shortName: "Galo", leagueCode: "BSA", confirmed: true },
  { id: 6684, name: "Internacional", shortName: "Inter", leagueCode: "BSA", confirmed: true },
  { id: 1767, name: "Grêmio", shortName: "Grêmio", leagueCode: "BSA", confirmed: true },
  { id: 6685, name: "Santos", shortName: "Santos", leagueCode: "BSA", confirmed: true },
  { id: 1777, name: "Bahia", shortName: "Bahia", leagueCode: "BSA", confirmed: true },
  { id: 1768, name: "Athletico Paranaense", shortName: "Athletico-PR", leagueCode: "BSA", confirmed: true },
  { id: 1782, name: "Vitória", shortName: "Vitória", leagueCode: "BSA", confirmed: true },
  { id: 4286, name: "Red Bull Bragantino", shortName: "Bragantino", leagueCode: "BSA", confirmed: true },
  { id: 4364, name: "Mirassol", shortName: "Mirassol", leagueCode: "BSA", confirmed: true },
  { id: 4241, name: "Coritiba", shortName: "Coritiba", leagueCode: "BSA", confirmed: true },
  { id: 4287, name: "Clube do Remo", shortName: "Remo", leagueCode: "BSA", confirmed: true },
  { id: 1772, name: "Chapecoense", shortName: "Chapecoense", leagueCode: "BSA", confirmed: true },
];

export const TEAM_IDS = new Set(TEAMS.map((t) => t.id));

export function getTeamById(id: number): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}
