import { sgfFromMoves } from "@/review/sgf";

export type SampleGame = {
  id: string;
  title: string;
  detail: string;
  sgf: string;
};

const shortNine = sgfFromMoves({
  size: 9,
  komi: 5.5,
  black: "Preto",
  white: "Branco",
  result: "",
  name: "Estudo em 9×9",
  event: "Partida de exemplo",
  moves: [
    "E5",
    "G3",
    "C7",
    "C3",
    "G7",
    "E3",
    "E7",
    "G5",
    "C5",
    "D4",
    "F6",
    "F4",
    "D6",
    "E4",
    "E6",
    "D5",
    "F5",
    "C4",
    "G4",
    "B5",
    "H5",
    "D3",
    "F7",
    "C6",
    "G6",
    "E2",
    "E8",
    "D7",
    "F3",
    "C2",
    "G8",
  ],
});

const fuseki = sgfFromMoves({
  size: 19,
  komi: 6.5,
  black: "Preto",
  white: "Branco",
  name: "Fuseki de exemplo",
  event: "Abertura em 19×19",
  moves: [
    "Q16",
    "D16",
    "Q4",
    "D4",
    "Q10",
    "D10",
    "K10",
    "O17",
    "R14",
    "C6",
    "F3",
    "C14",
    "F17",
    "R6",
    "O3",
    "K4",
    "K16",
    "H17",
    "N17",
    "P17",
    "O16",
    "R10",
    "O10",
    "C10",
    "F10",
    "H10",
    "J10",
    "L10",
    "N10",
    "M11",
    "N11",
    "M9",
    "N9",
  ],
});

export const SAMPLES: SampleGame[] = [
  {
    id: "nine",
    title: "9×9 curto",
    detail: "Leitura rápida, bom para o primeiro contato.",
    sgf: shortNine,
  },
  {
    id: "nineteen",
    title: "19×19 fuseki",
    detail: "Abertura no tabuleiro grande.",
    sgf: fuseki,
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0]!;
