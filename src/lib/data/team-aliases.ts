// Apelidos comuns que torcedores usam pra times. Tudo em lowercase, sem
// acentos. O resolver normaliza a query antes de comparar com este mapa.
//
// Quando o usuário cita "Mengão", "City" ou "United", a gente quer
// resolver pra um time específico da lista curada (ver `teams.ts`). O
// destino é o `name` ou `shortName` exato — o resolver faz match de string
// igual contra a tabela.

export const TEAM_ALIASES: Record<string, string> = {
  // Premier League
  city: "Manchester City",
  "man city": "Manchester City",
  united: "Manchester United",
  "man united": "Manchester United",
  "man utd": "Manchester United",
  red: "Liverpool FC",
  reds: "Liverpool FC",
  pool: "Liverpool FC",
  gunners: "Arsenal FC",
  spurs: "Tottenham Hotspur",
  villa: "Aston Villa",

  // La Liga
  real: "Real Madrid",
  madrid: "Real Madrid",
  merengues: "Real Madrid",
  barca: "FC Barcelona",
  barça: "FC Barcelona",
  barcelona: "FC Barcelona",
  blaugrana: "FC Barcelona",
  atleti: "Atlético de Madrid",
  atletico: "Atlético de Madrid",
  "atletico madrid": "Atlético de Madrid",

  // Serie A
  inter: "Internazionale",
  nerazzurri: "Internazionale",
  milan: "AC Milan",
  rossoneri: "AC Milan",
  juve: "Juventus FC",
  juventus: "Juventus FC",
  napoli: "SSC Napoli",
  roma: "AS Roma",

  // Bundesliga
  bayern: "Bayern de Munique",
  "bayern munique": "Bayern de Munique",
  "bayern munich": "Bayern de Munique",
  dortmund: "Borussia Dortmund",
  bvb: "Borussia Dortmund",
  leverkusen: "Bayer Leverkusen",

  // Ligue 1
  psg: "Paris Saint-Germain",
  paris: "Paris Saint-Germain",
  monaco: "AS Monaco",
  marseille: "Olympique de Marseille",
  om: "Olympique de Marseille",

  // Brasileirão — apelidos clássicos
  mengao: "Flamengo",
  mengão: "Flamengo",
  fla: "Flamengo",
  rubronegro: "Flamengo",
  porco: "Palmeiras",
  verdao: "Palmeiras",
  verdão: "Palmeiras",
  palestra: "Palmeiras",
  timao: "Corinthians",
  timão: "Corinthians",
  "corinthians paulista": "Corinthians",
  spfc: "São Paulo",
  "sao paulo": "São Paulo",
  tricolor: "Fluminense",
  flu: "Fluminense",
  vasco: "Vasco da Gama",
  cruzmaltino: "Vasco da Gama",
  "gigante da colina": "Vasco da Gama",
  fogao: "Botafogo",
  fogão: "Botafogo",
  glorioso: "Botafogo",
  raposa: "Cruzeiro",
  galo: "Atlético Mineiro",
  "atletico mineiro": "Atlético Mineiro",
  "atletico mg": "Atlético Mineiro",
  "atletico-mg": "Atlético Mineiro",
  colorado: "Internacional",
  inter_br: "Internacional",
  internacional: "Internacional",
  gremio: "Grêmio",
  grêmio: "Grêmio",
  imortal: "Grêmio",
  santos: "Santos FC",
  peixe: "Santos FC",
  esquadrao: "Bahia",
  esquadrão: "Bahia",
  leao: "Fortaleza",
  leão: "Fortaleza",
  furacao: "Athletico Paranaense",
  furacão: "Athletico Paranaense",
  "athletico-pr": "Athletico Paranaense",
  "athletico pr": "Athletico Paranaense",
  rubronegrobaiano: "Vitória",
};
