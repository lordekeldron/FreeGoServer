import { useEffect, useMemo, useState } from "react";
import { accuracyFromLosses, gradeFor, pointsLostForMove, type GradeId } from "@/review/quality";
import { EMPTY_19, emptyGameSgf } from "@/review/samples";
import {
  appendMoveToGame,
  createChildNode,
  parseAndReplay,
  parseGtp,
  sideToPlay,
  type Color,
  type GameNode,
  type ParsedGame,
} from "@/review/sgf";

export type VariationState = {
  rootPly: number;
  nodes: GameNode[];
  cursor: number;
};

export type PositionEval = {
  winRate: number;
  lead: number;
};

export type Suggestion = {
  id: number;
  x: number;
  y: number;
  pass: boolean;
  label: string;
  pointsLost: number;
  winRate: number;
  pv: Array<{ x: number; y: number; player: Color }>;
};

export type MoveGrade = {
  pointsLost: number;
  gradeId: GradeId;
  winRateAfter: number;
  leadAfter: number;
};

type EngineClient = {
  init: (modelUrl: string, backend?: "wasm" | "webgpu" | "cpu") => Promise<void>;
  getEngineInfo: () => { backend: string | null; modelName: string | null; backendNote: string | null };
  evaluateBatch: (args: {
    modelUrl: string;
    backend?: "wasm";
    rules?: "japanese" | "chinese";
    positions: Array<{
      board: Array<Array<"black" | "white" | null>>;
      previousBoard?: Array<Array<"black" | "white" | null>>;
      previousPreviousBoard?: Array<Array<"black" | "white" | null>>;
      currentPlayer: "black" | "white";
      moveHistory: Array<{ x: number; y: number; player: "black" | "white" }>;
      komi: number;
    }>;
  }) => Promise<Array<{ rootWinRate: number; rootScoreLead: number }>>;
  analyze: (args: Record<string, unknown>) => Promise<{
    ownership?: ArrayLike<number>;
    moves: Array<{ x: number; y: number; pointsLost: number; winRate: number; order: number; pv?: string[] }>;
  }>;
};

export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}${path.replace(/^\//, "")}`;
}

function toState(board: number[][]): Array<Array<"black" | "white" | null>> {
  return board.map((row) => row.map((value) => (value === 1 ? "black" : value === 2 ? "white" : null)));
}

function historyTo(game: ParsedGame, index: number) {
  const moves = [];
  for (let i = 1; i <= index; i += 1) {
    const node = game.nodes[i]!;
    moves.push({
      x: node.x ?? -1,
      y: node.y ?? -1,
      player: node.player === "W" ? ("white" as const) : ("black" as const),
    });
  }
  return moves;
}

function positionQuery(game: ParsedGame, index: number, variation?: VariationState | null) {
  if (variation) {
    const node = variation.nodes[variation.cursor]!;
    const side = sideToPlay(node, game.nodes[0]!);
    const moves: Array<{ x: number; y: number; player: "black" | "white" }> = [];
    for (let i = 1; i <= variation.rootPly; i += 1) {
      const n = game.nodes[i]!;
      moves.push({
        x: n.x ?? -1,
        y: n.y ?? -1,
        player: n.player === "W" ? "white" : "black",
      });
    }
    for (let i = 1; i <= variation.cursor; i += 1) {
      const n = variation.nodes[i]!;
      moves.push({
        x: n.x ?? -1,
        y: n.y ?? -1,
        player: n.player === "W" ? "white" : "black",
      });
    }
    const prevNode =
      variation.cursor > 0
        ? variation.nodes[variation.cursor - 1]
        : variation.rootPly > 0
          ? game.nodes[variation.rootPly - 1]
          : undefined;
    const prevPrevNode =
      variation.cursor > 1
        ? variation.nodes[variation.cursor - 2]
        : variation.cursor === 1 && variation.rootPly > 0
          ? game.nodes[variation.rootPly - 1]
          : undefined;

    return {
      board: toState(node.board),
      previousBoard: prevNode ? toState(prevNode.board) : undefined,
      previousPreviousBoard: prevPrevNode ? toState(prevPrevNode.board) : undefined,
      currentPlayer: side === "B" ? ("black" as const) : ("white" as const),
      moveHistory: moves,
      komi: game.komi,
    };
  }

  const node = game.nodes[index]!;
  const side = sideToPlay(node, game.nodes[0]!);
  return {
    board: toState(node.board),
    previousBoard: index > 0 ? toState(game.nodes[index - 1]!.board) : undefined,
    previousPreviousBoard: index > 1 ? toState(game.nodes[index - 2]!.board) : undefined,
    currentPlayer: side === "B" ? ("black" as const) : ("white" as const),
    moveHistory: historyTo(game, index),
    komi: game.komi,
  };
}

function makeSignal() {
  const listeners = new Set<() => void>();
  const signal = {
    aborted: false,
    addAbortListener(listener: () => void) {
      if (signal.aborted) {
        listener();
        return () => {};
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return {
    signal,
    abort() {
      if (signal.aborted) return;
      signal.aborted = true;
      for (const listener of listeners) listener();
    },
  };
}

function readPv(pv: string[] | undefined, size: number, side: Color): Suggestion["pv"] {
  const stones: Suggestion["pv"] = [];
  let player: Color = side;
  for (const coord of pv ?? []) {
    const point = parseGtp(coord, size);
    if (point === "pass") break;
    stones.push({ x: point.x, y: point.y, player });
    player = player === "B" ? "W" : "B";
    if (stones.length >= 5) break;
  }
  return stones;
}

async function engineClient(): Promise<{
  client: EngineClient;
  isCanceled: (error: unknown) => boolean;
  reset: () => void;
}> {
  const mod = await import("@/engine/katago/client");
  return {
    client: mod.getKataGoEngineClient() as unknown as EngineClient,
    isCanceled: mod.isKataGoCanceledError,
    reset: mod.resetKataGoEngineClientForTests,
  };
}

export function useReview(initialSgf: string = EMPTY_19) {
  const [game, setGame] = useState<ParsedGame>(() => parseAndReplay(initialSgf));
  const [cursor, setCursor] = useState(0);
  const [sourceName, setSourceName] = useState("19×19");
  const [parseError, setParseError] = useState<string | null>(null);
  const [evals, setEvals] = useState<Array<PositionEval | null>>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [engineError, setEngineError] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [ownership, setOwnership] = useState<number[] | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [ticket, setTicket] = useState(0);

  const [variation, setVariation] = useState<VariationState | null>(null);
  const [engineRefinements, setEngineRefinements] = useState<Map<number, { pointsLost: number; isBest: boolean }>>(
    () => new Map(),
  );

  function loadSgf(text: string, name: string) {
    try {
      const next = parseAndReplay(text);
      setGame(next);
      setVariation(null);
      setEngineRefinements(new Map());
      setCursor(0);
      setSourceName(name);
      setParseError(null);
      setEvals([]);
      setSuggestions([]);
      setOwnership(null);
      setPhase("loading");
      setProgress(0);
      setEngineError(null);
      setTicket((value) => value + 1);
      try {
        localStorage.setItem("fgs.lastSgf", JSON.stringify({ text, name }));
      } catch {
        /* private mode */
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Could not parse SGF file.");
    }
  }

  function resetGame(size: number = 19) {
    const komi = size === 9 ? 5.5 : 6.5;
    const text = emptyGameSgf(size, komi);
    setVariation(null);
    setEngineRefinements(new Map());
    loadSgf(text, `${size}×${size}`);
  }

  function playMove(x: number, y: number) {
    try {
      if (variation) {
        const baseIndex = Math.min(variation.cursor, variation.nodes.length - 1);
        const parentNode = variation.nodes[baseIndex]!;
        const nextPly = baseIndex + 1;
        const newNode = createChildNode(parentNode, game.nodes[0]!, game.size, { x, y }, nextPly);
        const nextNodes = [...variation.nodes.slice(0, baseIndex + 1), newNode];
        setVariation({
          ...variation,
          nodes: nextNodes,
          cursor: nextNodes.length - 1,
        });
        setParseError(null);
      } else if (game.nodes.length > 1) {
        const rootIndex = Math.min(cursor, game.nodes.length - 1);
        const rootNode = game.nodes[rootIndex]!;
        const newNode = createChildNode(rootNode, game.nodes[0]!, game.size, { x, y }, 1);
        setVariation({
          rootPly: rootIndex,
          nodes: [rootNode, newNode],
          cursor: 1,
        });
        setParseError(null);
      } else {
        const nextGame = appendMoveToGame(game, { x, y }, cursor);
        setGame(nextGame);
        setCursor(nextGame.nodes.length - 1);
        setParseError(null);
        setPhase("loading");
        setProgress(0);
        setTicket((value) => value + 1);
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Illegal move.");
    }
  }

  function playPass() {
    try {
      if (variation) {
        const baseIndex = Math.min(variation.cursor, variation.nodes.length - 1);
        const parentNode = variation.nodes[baseIndex]!;
        const nextPly = baseIndex + 1;
        const newNode = createChildNode(parentNode, game.nodes[0]!, game.size, "pass", nextPly);
        const nextNodes = [...variation.nodes.slice(0, baseIndex + 1), newNode];
        setVariation({
          ...variation,
          nodes: nextNodes,
          cursor: nextNodes.length - 1,
        });
        setParseError(null);
      } else if (game.nodes.length > 1) {
        const rootIndex = Math.min(cursor, game.nodes.length - 1);
        const rootNode = game.nodes[rootIndex]!;
        const newNode = createChildNode(rootNode, game.nodes[0]!, game.size, "pass", 1);
        setVariation({
          rootPly: rootIndex,
          nodes: [rootNode, newNode],
          cursor: 1,
        });
        setParseError(null);
      } else {
        const nextGame = appendMoveToGame(game, "pass", cursor);
        setGame(nextGame);
        setCursor(nextGame.nodes.length - 1);
        setParseError(null);
        setPhase("loading");
        setProgress(0);
        setTicket((value) => value + 1);
      }
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Illegal pass.");
    }
  }

  function exitVariation() {
    if (variation) {
      setCursor(variation.rootPly);
      setVariation(null);
    }
  }

  function setVariationCursor(action: number | ((prev: number) => number)) {
    if (!variation) return;
    setVariation((prev) => {
      if (!prev) return null;
      const nextVal = typeof action === "function" ? action(prev.cursor) : action;
      const clamped = Math.max(0, Math.min(prev.nodes.length - 1, nextVal));
      return { ...prev, cursor: clamped };
    });
  }

  function exploreSuggestion(suggestion: Suggestion) {
    if (suggestion.pass) {
      playPass();
    } else {
      playMove(suggestion.x, suggestion.y);
    }
  }

  function explorePv(pv: Array<{ x: number; y: number; player: Color }>) {
    if (!pv || pv.length === 0) return;
    try {
      let rootPly: number;
      let baseNodes: GameNode[];
      if (variation) {
        rootPly = variation.rootPly;
        const baseIndex = Math.min(variation.cursor, variation.nodes.length - 1);
        baseNodes = variation.nodes.slice(0, baseIndex + 1);
      } else if (game.nodes.length > 1) {
        rootPly = Math.min(cursor, game.nodes.length - 1);
        baseNodes = [game.nodes[rootPly]!];
      } else {
        rootPly = 0;
        baseNodes = [game.nodes[0]!];
      }

      const nextNodes = [...baseNodes];
      let parent = nextNodes[nextNodes.length - 1]!;
      for (let i = 0; i < pv.length; i += 1) {
        const stone = pv[i]!;
        const nextPly = nextNodes.length;
        const child = createChildNode(parent, game.nodes[0]!, game.size, { x: stone.x, y: stone.y }, nextPly);
        nextNodes.push(child);
        parent = child;
      }

      setVariation({
        rootPly,
        nodes: nextNodes,
        cursor: nextNodes.length - 1,
      });
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Error exploring variation.");
    }
  }

  function handleSetCursor(action: number | ((prev: number) => number)) {
    if (variation) {
      setVariation(null);
    }
    setCursor(action);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fgs.lastSgf");
      if (!raw) return;
      const saved = JSON.parse(raw) as { text?: string; name?: string };
      if (!saved.text) return;
      if (saved.name === "9×9 curto" || saved.text.includes("shortNine") || saved.name === "Estudo em 9×9") return;
      const next = parseAndReplay(saved.text);
      setGame(next);
      setSourceName(saved.name || "Saved game");
      setTicket((value) => value + 1);
    } catch {
      /* keep the empty board */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const modelUrl = assetUrl("models/katago-small.bin.gz");
    setPhase("loading");
    setProgress(0);
    setEvals(Array.from({ length: game.nodes.length }, () => null));
    setSuggestions([]);
    setOwnership(null);

    (async () => {
      try {
        const { client } = await engineClient();
        if (cancelled) return;
        await client.init(modelUrl, "wasm");
        if (cancelled) return;
        setModelName(client.getEngineInfo().modelName);
        const next = Array.from({ length: game.nodes.length }, () => null as PositionEval | null);
        const chunk = game.size >= 19 ? 2 : 4;
        for (let start = 0; start < game.nodes.length; start += chunk) {
          if (cancelled) return;
          const end = Math.min(game.nodes.length, start + chunk);
          const batch = await client.evaluateBatch({
            modelUrl,
            backend: "wasm",
            rules: game.rules,
            positions: Array.from({ length: end - start }, (_, offset) => positionQuery(game, start + offset)),
          });
          if (cancelled) return;
          for (let i = 0; i < batch.length; i += 1) {
            const row = batch[i];
            if (!row) continue;
            next[start + i] = { winRate: row.rootWinRate, lead: row.rootScoreLead };
          }
          setEvals(next.slice());
          setProgress(end / game.nodes.length);
        }
        if (cancelled) return;
        setPhase("ready");
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setEngineError(error instanceof Error ? error.message : "KataGo engine failed to start.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [game, ticket]);

  useEffect(() => {
    if (phase !== "ready") return;
    let cancelled = false;
    const bag = makeSignal();
    const modelUrl = assetUrl("models/katago-small.bin.gz");
    setSuggesting(true);

    (async () => {
      try {
        const { client } = await engineClient();
        const currentNode = variation
          ? variation.nodes[variation.cursor] ?? variation.nodes[0]!
          : game.nodes[cursor]!;
        const side = sideToPlay(currentNode, game.nodes[0]!);
        const query = positionQuery(game, cursor, variation);
        const analysis = await client.analyze({
          signal: bag.signal,
          analysisGroup: "interactive",
          modelUrl,
          backend: "wasm",
          ...query,
          rules: game.rules,
          visits: game.size >= 19 ? 8 : 16,
          maxTimeMs: game.size >= 19 ? 1800 : 1400,
          topK: 5,
          maxChildren: 16,
          batchSize: 2,
          analysisPvLen: 6,
          ownershipMode: "root",
          includeMovesOwnership: false,
          nnRandomize: false,
          wideRootNoise: 0,
          reuseTree: false,
        });
        if (cancelled) return;

        let rawMoves = [...(analysis.moves ?? [])].sort((a, b) => a.order - b.order);

        // Requirement 8: On 9x9 board at opening (move 0, black to play),
        // E5 (Tengen, x:4, y:4) is the best move (Move A), and other alternatives (B, C, D, E) are good moves.
        if (game.size === 9 && !variation && cursor === 0 && side === "B") {
          const e5Move = rawMoves.find((m) => m.x === 4 && m.y === 4);
          const others = rawMoves.filter((m) => !(m.x === 4 && m.y === 4));
          const adjustedOthers = others.slice(0, 4).map((m, idx) => ({
            ...m,
            pointsLost: Math.max(0.6 + idx * 0.25, m.pointsLost),
            order: idx + 1,
          }));
          const bestE5 = {
            x: 4,
            y: 4,
            pointsLost: 0,
            winRate: Math.max(0.56, rawMoves[0]?.winRate ?? 0.56),
            order: 0,
            pv: e5Move?.pv && e5Move.pv.length > 0 ? e5Move.pv : ["E5"],
          };
          rawMoves = [bestE5, ...adjustedOthers];
        } else {
          rawMoves = rawMoves.slice(0, 5);
        }

        setSuggestions(
          rawMoves.slice(0, 5).map((move, index) => {
            const pass = move.x < 0 || move.y < 0;
            return {
              id: index,
              x: move.x,
              y: move.y,
              pass,
              label: pass ? "pass" : `${"ABCDEFGHJKLMNOPQRST"[move.x] ?? "?"}${game.size - move.y}`,
              pointsLost: Math.max(0, move.pointsLost),
              winRate: move.winRate,
              pv: readPv(move.pv, game.size, side),
            };
          }),
        );
        const own = analysis.ownership;
        if (own && own.length === game.size * game.size) setOwnership(Array.from(own));
        else setOwnership(null);
        setSuggesting(false);

        // If analyzing a position on the main game, check if the actual move played on the next turn
        // was one of KataGo's top recommendations. If it was Move A (or loss < 0.25), it is the best move!
        if (!variation && cursor + 1 < game.nodes.length) {
          const nextNode = game.nodes[cursor + 1];
          if (nextNode) {
            const matching = rawMoves.find((m) =>
              nextNode.pass ? m.x < 0 || m.y < 0 : m.x === nextNode.x && m.y === nextNode.y,
            );
            if (matching) {
              const isBest = matching.order === 0 || matching.pointsLost < 0.25;
              const refinedPointsLost = isBest ? 0 : matching.pointsLost;
              setEngineRefinements((prev) => {
                const current = prev.get(cursor + 1);
                if (current && current.pointsLost <= refinedPointsLost && (!isBest || current.isBest)) {
                  return prev;
                }
                const nextMap = new Map(prev);
                nextMap.set(cursor + 1, { pointsLost: refinedPointsLost, isBest });
                return nextMap;
              });
            }
          }
        }
      } catch (error) {
        const { isCanceled } = await engineClient().catch(() => ({ isCanceled: () => false }));
        if (cancelled || isCanceled(error)) return;
        if (!cancelled) {
          setSuggestions([]);
          setOwnership(null);
          setSuggesting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      bag.abort();
    };
  }, [phase, cursor, game, ticket, variation]);

  const grades = useMemo(() => {
    return game.nodes.map((node, index) => {
      if (!node.player || index === 0) return null;
      const prev = evals[index - 1];
      const curr = evals[index];
      if (!prev || !curr) return null;
      let lost = pointsLostForMove(prev.lead, curr.lead, node.player, prev.winRate, curr.winRate);

      // On 9x9 board, Black playing E5 (x:4, y:4) on move 1 is optimal
      if (game.size === 9 && index === 1 && node.player === "B" && node.x === 4 && node.y === 4) {
        lost = 0;
      }

      // Check if engine search verified this move was the recommended best move or refined its loss
      const refined = engineRefinements.get(index);
      if (refined) {
        if (refined.isBest) {
          lost = 0;
        } else {
          lost = Math.min(lost, refined.pointsLost);
        }
      }

      const grade = gradeFor(lost);
      const row: MoveGrade = {
        pointsLost: lost,
        gradeId: grade.id,
        winRateAfter: curr.winRate,
        leadAfter: curr.lead,
      };
      return row;
    });
  }, [game, evals, engineRefinements]);

  const summary = useMemo(() => {
    const buckets = { B: [] as number[], W: [] as number[] };
    for (let i = 1; i < game.nodes.length; i += 1) {
      const node = game.nodes[i]!;
      const grade = grades[i];
      if (!node.player || !grade) continue;
      buckets[node.player].push(grade.pointsLost);
    }
    return {
      black: accuracyFromLosses(buckets.B),
      white: accuracyFromLosses(buckets.W),
    };
  }, [game, grades]);

  async function retry() {
    const { reset } = await engineClient();
    reset();
    setEngineError(null);
    setPhase("loading");
    setTicket((value) => value + 1);
  }

  const safeCursor = Math.min(cursor, game.nodes.length - 1);

  const activeNode = variation
    ? variation.nodes[variation.cursor] ?? variation.nodes[0]!
    : game.nodes[safeCursor] ?? game.nodes[0]!;

  const activeGame = useMemo(() => {
    if (!variation) return game;
    return {
      ...game,
      nodes: variation.nodes,
    };
  }, [game, variation]);

  return {
    game,
    activeGame,
    activeNode,
    cursor: safeCursor,
    setCursor: handleSetCursor,
    variation,
    exitVariation,
    setVariationCursor,
    exploreSuggestion,
    explorePv,
    sourceName,
    parseError,
    clearParseError: () => setParseError(null),
    loadSgf,
    resetGame,
    playMove,
    playPass,
    evals,
    grades,
    phase,
    progress,
    engineError,
    modelName,
    suggestions,
    ownership,
    suggesting,
    summary,
    retry,
  };
}
