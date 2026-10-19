import { sgfFromMoves } from "@/review/sgf";

export type SampleGame = {
  id: string;
  title: string;
  detail: string;
  sgf: string;
};

export function emptyGameSgf(size = 19, komi = size === 9 ? 5.5 : 6.5): string {
  return `(;GM[1]FF[4]SZ[${size}]KM[${komi}]RU[Japanese]PB[Black]PW[White])`;
}

export const EMPTY_19 = emptyGameSgf(19, 6.5);
export const EMPTY_13 = emptyGameSgf(13, 6.5);
export const EMPTY_9 = emptyGameSgf(9, 5.5);

const shortNine = sgfFromMoves({
  size: 9,
  komi: 5.5,
  black: "Black",
  white: "White",
  result: "",
  name: "9×9 Game",
  event: "Sample Game",
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

const thirteenSample = sgfFromMoves({
  size: 13,
  komi: 6.5,
  black: "Black",
  white: "White",
  name: "13×13 Game",
  event: "Sample Game",
  moves: [
    "K10",
    "D4",
    "D10",
    "K4",
    "G7",
    "J4",
    "J3",
    "H3",
    "H4",
    "K3",
    "D7",
    "C7",
    "C8",
    "B8",
    "C9",
  ],
});

const fuseki = sgfFromMoves({
  size: 19,
  komi: 6.5,
  black: "Black",
  white: "White",
  name: "19×19 Fuseki",
  event: "Opening 19×19",
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
    id: "empty19",
    title: "19×19",
    detail: "Empty 19×19 board",
    sgf: EMPTY_19,
  },
  {
    id: "empty13",
    title: "13×13",
    detail: "Empty 13×13 board",
    sgf: EMPTY_13,
  },
  {
    id: "empty9",
    title: "9×9",
    detail: "Empty 9×9 board",
    sgf: EMPTY_9,
  },
  {
    id: "nine-sample",
    title: "9×9 Sample",
    detail: "9×9 complete game sample",
    sgf: shortNine,
  },
  {
    id: "thirteen-sample",
    title: "13×13 Sample",
    detail: "13×13 opening sample",
    sgf: thirteenSample,
  },
  {
    id: "nineteen-sample",
    title: "19×19 Sample",
    detail: "19×19 opening sample",
    sgf: fuseki,
  },
];

export const DEFAULT_SAMPLE = SAMPLES[0]!;
