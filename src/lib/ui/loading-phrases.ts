// Frases curtas com personalidade de comentarista, mostradas durante esperas.
// Cada categoria é uma lista; o hook `useCyclingPhrase` cicla entre elas
// enquanto o estado de loading está ativo.

export const LOADING_PHRASES = {
  feed: [
    "Olhando os próximos jogos...",
    "Conferindo a tabela...",
    "Catalogando os clássicos...",
    "Separando o que tá bombando...",
  ],
  chat: [
    "Buscando os números...",
    "Analisando a forma...",
    "Lembrando o último confronto...",
    "Pensando como comentarista...",
    "Pegando o histórico recente...",
  ],
  prediction: [
    "Cruzando os dados...",
    "Calculando as chances...",
    "Olhando o mando de campo...",
    "Pesando a forma recente...",
  ],
} as const;

export type LoadingCategory = keyof typeof LOADING_PHRASES;
