// Types reduzidos das estruturas que consumimos da Football-Data.org v4.
// Adicionamos campos só conforme necessário — manter conservador.

export type FdTeam = {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  founded?: number;
  venue?: string;
};

export type FdCompetition = {
  id: number;
  code: string;
  name: string;
  emblem?: string;
  currentSeason?: {
    startDate: string;
    endDate: string;
    currentMatchday?: number;
  };
};

export type FdMatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

export type FdMatch = {
  id: number;
  utcDate: string;
  status: FdMatchStatus;
  matchday?: number;
  competition: {
    id: number;
    code: string;
    name: string;
    emblem?: string;
  };
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  score: {
    winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
    duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT";
    fullTime: { home: number | null; away: number | null };
    halfTime?: { home: number | null; away: number | null };
  };
  venue?: string;
};

export type FdStandingsRow = {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type FdStandingsResponse = {
  competition: FdCompetition;
  standings: Array<{
    stage: string;
    type: string;
    group?: string | null;
    table: FdStandingsRow[];
  }>;
};

export type FdMatchesResponse = {
  count: number;
  matches: FdMatch[];
};

export type FdHeadToHeadAggregate = {
  numberOfMatches: number;
  totalGoals: number;
  homeTeam: { id: number; name: string; wins: number; draws: number; losses: number };
  awayTeam: { id: number; name: string; wins: number; draws: number; losses: number };
};

export type FdHeadToHeadResponse = {
  filters?: { limit: number };
  resultSet?: { count: number; first?: string; last?: string };
  aggregates: FdHeadToHeadAggregate;
  matches: FdMatch[];
};
