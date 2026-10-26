import { useMemo, useState } from "react";
import { ArrowLeft, Bot, Loader2, RotateCcw } from "lucide-react";
import { Goban } from "@/components/goban";
import { getKataGoEngineClient } from "@/engine/katago/client";
import { parseAndReplay, coordLabel, type ParsedGame } from "@/review/sgf";
import { assetUrl } from "@/review/use-review";
import type { BoardState, Move } from "@/types";

type Props = { language: "en" | "pt"; onBack: () => void };

const emptySgf = (size: number) => `(;GM[1]FF[4]SZ[${size}]KM[6.5]PB[Você]PW[KataGo]`;
const boardState = (board: number[][]): BoardState => board.map((row) => row.map((value) => value === 1 ? "black" : value === 2 ? "white" : null));

export function KatagoGame({ language, onBack }: Props) {
  const pt = language === "pt";
  const [size, setSize] = useState<9 | 13 | 19>(9);
  const [sgf, setSgf] = useState(emptySgf(9));
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const game = useMemo<ParsedGame>(() => parseAndReplay(`${sgf})`), [sgf]);
  const node = game.nodes.at(-1)!;
  const humanTurn = game.nodes.length % 2 === 1;

  function restart(nextSize = size) {
    setSize(nextSize);
    setSgf(emptySgf(nextSize));
    setError(null);
  }

  async function playHuman(x: number, y: number) {
    if (!humanTurn || thinking) return;
    try {
      const next = parseAndReplay(`${sgf};${"B"}[${String.fromCharCode(97 + x)}${String.fromCharCode(97 + y)}])`);
      setSgf(`${sgf};B[${String.fromCharCode(97 + x)}${String.fromCharCode(97 + y)}`);
      setError(null);
      setThinking(true);
      const client = getKataGoEngineClient();
      const analysis = await client.analyze({ modelUrl: assetUrl("models/katago-small.bin.gz"), backend: "wasm", board: boardState(next.nodes.at(-1)!.board), previousBoard: boardState(node.board), currentPlayer: "white", moveHistory: next.nodes.slice(1).filter((item) => item.x != null && item.y != null).map((item, index) => ({ x: item.x!, y: item.y!, player: index % 2 === 0 ? "black" : "white" } as Move)), komi: 6.5, rules: "japanese", topK: 1, visits: 120 });
      const best = analysis.moves?.[0];
      if (best && best.x >= 0 && best.y >= 0) setSgf((current) => `${current};W[${String.fromCharCode(97 + best.x)}${String.fromCharCode(97 + best.y)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : pt ? "Não foi possível obter a resposta do KataGo." : "KataGo could not respond.");
    } finally {
      setThinking(false);
    }
  }

  return <main className="min-h-screen bg-paper px-4 py-8 text-ink sm:px-8"><div className="mx-auto flex max-w-6xl flex-col gap-6"><header className="flex flex-wrap items-center justify-between gap-4"><div><button type="button" onClick={onBack} className="btn-quiet mb-4 inline-flex items-center gap-2 px-3 py-2 text-sm"><ArrowLeft className="size-4" />{pt ? "Voltar" : "Back"}</button><h1 className="flex items-center gap-3 font-display text-4xl font-bold"><Bot className="size-9 text-pine" />{pt ? "Contra o KataGo" : "Play KataGo"}</h1><p className="mt-2 text-sm text-muted">{pt ? "Você joga de pretas. Clique no tabuleiro para fazer um lance." : "You play Black. Click the board to make a move."}</p></div><div className="flex items-center gap-2"><select value={size} onChange={(event) => restart(Number(event.target.value) as 9 | 13 | 19)} className="rounded-lg border border-line bg-paper-2 px-3 py-2 text-sm"><option value={9}>9 × 9</option><option value={13}>13 × 13</option><option value={19}>19 × 19</option></select><button type="button" onClick={() => restart()} className="btn-quiet inline-flex items-center gap-2 px-3 py-2 text-sm"><RotateCcw className="size-4" />{pt ? "Reiniciar" : "Restart"}</button></div></header><section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="rounded-2xl border border-line bg-paper-2 p-4 shadow-xs"><Goban game={game} language={language} cursor={game.nodes.length - 1} gradeIds={[]} suggestions={[]} ownership={null} showMarks={false} showTerritory={false} ghosts={[]} activeSuggestion={null} onJump={() => undefined} onHoverSuggestion={() => undefined} onPlayPoint={playHuman} /><p className="mt-3 text-center text-sm font-medium text-muted" aria-live="polite">{thinking ? <span className="inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" />{pt ? "KataGo está pensando…" : "KataGo is thinking…"}</span> : humanTurn ? (pt ? "Sua vez" : "Your turn") : (pt ? "Vez do KataGo" : "KataGo's turn")}</p></div><aside className="rounded-2xl border border-line bg-paper-2 p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{pt ? "Partida" : "Game"}</p><h2 className="mt-2 font-display text-2xl font-bold">{game.nodes.length - 1} {pt ? "lances" : "moves"}</h2><div className="mt-5 flex flex-col gap-2 text-sm text-muted"><p>{pt ? "Pretas" : "Black"}: Você</p><p>{pt ? "Brancas" : "White"}: KataGo</p><p>{pt ? "Revisão disponível após exportar o SGF." : "Review is available after exporting the SGF."}</p></div>{error ? <p role="alert" className="mt-5 rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}<button type="button" className="btn-primary mt-6 w-full px-4 py-2.5 text-sm" onClick={() => navigator.clipboard.writeText(`${sgf})`)}>{pt ? "Copiar SGF para revisão" : "Copy SGF for review"}</button></aside></section></div></main>;
}
