export type Color = "B" | "W";

export type GameNode = {
  ply: number;
  player: Color | null;
  x: number | null;
  y: number | null;
  pass: boolean;
  label: string;
  comment: string;
  board: number[][];
  origins: number[][];
  capturedBlack: number;
  capturedWhite: number;
};

export type ParsedGame = {
  size: number;
  komi: number;
  rules: "japanese" | "chinese";
  black: string;
  white: string;
  result: string;
  event: string;
  date: string;
  name: string;
  nodes: GameNode[];
};

type SgfNode = { props: Record<string, string[]>; children: SgfNode[] };

const COLS = "ABCDEFGHJKLMNOPQRST";

export function coordLabel(x: number, y: number, size: number): string {
  const col = COLS[x];
  if (!col) return "passe";
  return `${col}${size - y}`;
}

export function parseGtp(label: string, size: number): { x: number; y: number } | "pass" {
  const text = label.trim();
  if (!text || text.toLowerCase() === "pass" || text.toLowerCase() === "passe") return "pass";
  const col = text[0]?.toUpperCase() ?? "";
  const x = COLS.indexOf(col);
  const row = Number(text.slice(1));
  if (x < 0 || x >= size || !Number.isFinite(row) || row < 1 || row > size) {
    throw new Error(`Coordenada inválida: ${label}`);
  }
  return { x, y: size - row };
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => row.slice());
}

function cloneOrigins(origins: number[][]): number[][] {
  return origins.map((row) => row.slice());
}

function emptyBoard(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

function emptyOrigins(size: number): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(-1));
}

function neighbors(size: number, x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (x > 0) out.push([x - 1, y]);
  if (x + 1 < size) out.push([x + 1, y]);
  if (y > 0) out.push([x, y - 1]);
  if (y + 1 < size) out.push([x, y + 1]);
  return out;
}

function groupAt(board: number[][], x: number, y: number): { stones: Array<[number, number]>; libs: number } {
  const size = board.length;
  const color = board[y]?.[x] ?? 0;
  const stones: Array<[number, number]> = [];
  const seen = new Set<number>([y * size + x]);
  const libSeen = new Set<number>();
  const stack: Array<[number, number]> = [[x, y]];
  while (stack.length) {
    const [cx, cy] = stack.pop()!;
    stones.push([cx, cy]);
    for (const [nx, ny] of neighbors(size, cx, cy)) {
      const value = board[ny]?.[nx] ?? 0;
      const key = ny * size + nx;
      if (value === 0) {
        if (!libSeen.has(key)) libSeen.add(key);
      } else if (value === color && !seen.has(key)) {
        seen.add(key);
        stack.push([nx, ny]);
      }
    }
  }
  return { stones, libs: libSeen.size };
}

function boardKey(board: number[][], toPlay: Color): string {
  let key = toPlay;
  for (const row of board) key += row.join("");
  return key;
}

function countColor(board: number[][], color: number): number {
  let n = 0;
  for (const row of board) for (const value of row) if (value === color) n += 1;
  return n;
}

export function sideToPlay(node: GameNode, root: GameNode): Color {
  if (node.ply === 0) {
    return countColor(root.board, 1) > countColor(root.board, 2) ? "W" : "B";
  }
  return node.player === "B" ? "W" : "B";
}

function skipSpace(text: string, index: number): number {
  while (index < text.length && /\s/.test(text[index] ?? "")) index += 1;
  return index;
}

function parseTree(text: string, start: number): { node: SgfNode; index: number } {
  let i = skipSpace(text, start);
  if (text[i] !== "(") throw new Error("SGF sem uma árvore de lances.");
  i += 1;
  const sequence: SgfNode[] = [];
  while (true) {
    i = skipSpace(text, i);
    if (text[i] !== ";") break;
    i += 1;
    const props: Record<string, string[]> = {};
    while (true) {
      i = skipSpace(text, i);
      if (!/[A-Z]/.test(text[i] ?? "")) break;
      let key = "";
      while (/[A-Z]/.test(text[i] ?? "")) {
        key += text[i];
        i += 1;
      }
      const values: string[] = [];
      while (true) {
        i = skipSpace(text, i);
        if (text[i] !== "[") break;
        i += 1;
        let value = "";
        while (i < text.length && text[i] !== "]") {
          if (text[i] === "\\") {
            i += 1;
            value += text[i] ?? "";
            i += 1;
          } else {
            value += text[i];
            i += 1;
          }
        }
        if (text[i] === "]") i += 1;
        values.push(value);
      }
      props[key] = (props[key] ?? []).concat(values);
    }
    sequence.push({ props, children: [] });
  }
  const children: SgfNode[] = [];
  while (true) {
    i = skipSpace(text, i);
    if (text[i] !== "(") break;
    const child = parseTree(text, i);
    children.push(child.node);
    i = child.index;
  }
  i = skipSpace(text, i);
  if (text[i] === ")") i += 1;
  if (!sequence.length) {
    if (!children.length) throw new Error("Árvore SGF vazia.");
    return { node: children[0]!, index: i };
  }
  for (let k = 0; k < sequence.length - 1; k += 1) sequence[k]!.children = [sequence[k + 1]!];
  sequence[sequence.length - 1]!.children = children;
  return { node: sequence[0]!, index: i };
}

function prop(node: SgfNode, key: string): string {
  return node.props[key]?.[0] ?? "";
}

function applySetup(board: number[][], origins: number[][], node: SgfNode, size: number): void {
  const place = (values: string[] | undefined, color: number) => {
    for (const value of values ?? []) {
      const point = decodePoint(value, size);
      if (point === "pass") continue;
      board[point.y]![point.x] = color;
      origins[point.y]![point.x] = 0;
    }
  };
  for (const value of node.props.AE ?? []) {
    const point = decodePoint(value, size);
    if (point === "pass") continue;
    board[point.y]![point.x] = 0;
    origins[point.y]![point.x] = -1;
  }
  place(node.props.AB, 1);
  place(node.props.AW, 2);
}

function decodePoint(value: string, size: number): { x: number; y: number } | "pass" {
  const text = value.trim().toLowerCase();
  if (!text) return "pass";
  if (text.length < 2) return "pass";
  const x = text.charCodeAt(0) - 97;
  const y = text.charCodeAt(1) - 97;
  if (x < 0 || y < 0 || x >= size || y >= size) return "pass";
  return { x, y };
}

function playPoint(
  board: number[][],
  origins: number[][],
  x: number,
  y: number,
  color: number,
  ply: number,
): number {
  if ((board[y]?.[x] ?? 0) !== 0) {
    throw new Error(`Lance ilegal em ${coordLabel(x, y, board.length)}: interseção ocupada.`);
  }
  board[y]![x] = color;
  origins[y]![x] = ply;
  const size = board.length;
  const opponent = color === 1 ? 2 : 1;
  let captured = 0;
  for (const [nx, ny] of neighbors(size, x, y)) {
    if ((board[ny]?.[nx] ?? 0) !== opponent) continue;
    const group = groupAt(board, nx, ny);
    if (group.libs > 0) continue;
    for (const [sx, sy] of group.stones) {
      board[sy]![sx] = 0;
      origins[sy]![sx] = -1;
      captured += 1;
    }
  }
  if (groupAt(board, x, y).libs === 0) {
    throw new Error(`Lance ilegal em ${coordLabel(x, y, size)}: suicídio.`);
  }
  return captured;
}

export function parseAndReplay(source: string): ParsedGame {
  const text = source.replace(/^\uFEFF/, "").trim();
  const open = text.indexOf("(");
  if (open < 0) throw new Error("Não encontrei um SGF nesse texto.");
  const { node: root } = parseTree(text, open);
  const size = Math.min(19, Math.max(2, Number(prop(root, "SZ")) || 19));
  if (![9, 13, 19].includes(size)) {
    throw new Error("Este revisor lê tabuleiros de 9, 13 e 19 linhas.");
  }
  const komi = Number(prop(root, "KM"));
  const rulesText = prop(root, "RU").toLowerCase();
  const rules: ParsedGame["rules"] = rulesText.includes("chinese") || rulesText.includes("chin") ? "chinese" : "japanese";
  const board = emptyBoard(size);
  const origins = emptyOrigins(size);
  applySetup(board, origins, root, size);
  const nodes: GameNode[] = [
    {
      ply: 0,
      player: null,
      x: null,
      y: null,
      pass: false,
      label: "início",
      comment: cleanComment(prop(root, "C")),
      board: cloneBoard(board),
      origins: cloneOrigins(origins),
      capturedBlack: 0,
      capturedWhite: 0,
    },
  ];
  const seen = new Set<string>([boardKey(board, sideToPlay(nodes[0]!, nodes[0]!))]);
  let capturedBlack = 0;
  let capturedWhite = 0;
  let cursor = root.children[0] ?? null;
  while (cursor) {
    applySetup(board, origins, cursor, size);
    const blackMove = cursor.props.B?.[0];
    const whiteMove = cursor.props.W?.[0];
    const comment = cleanComment(prop(cursor, "C"));
    if (blackMove !== undefined || whiteMove !== undefined) {
      if (blackMove !== undefined && whiteMove !== undefined) {
        throw new Error("Um nó do SGF tem lance de preto e de branco ao mesmo tempo.");
      }
      const player: Color = blackMove !== undefined ? "B" : "W";
      const raw = (blackMove ?? whiteMove) as string;
      const point = decodePoint(raw, size);
      const next = cloneBoard(board);
      const nextOrigins = cloneOrigins(origins);
      const ply = nodes.length;
      const toPlayAfter: Color = player === "B" ? "W" : "B";
      let captured = 0;
      if (point !== "pass") {
        captured = playPoint(next, nextOrigins, point.x, point.y, player === "B" ? 1 : 2, ply);
        const afterKey = boardKey(next, toPlayAfter);
        if (seen.has(afterKey)) {
          throw new Error(`Lance ilegal em ${coordLabel(point.x, point.y, size)}: ko ou repetição.`);
        }
        for (let y = 0; y < size; y += 1) board[y] = next[y]!.slice();
        for (let y = 0; y < size; y += 1) origins[y] = nextOrigins[y]!.slice();
        seen.add(afterKey);
      } else {
        const afterKey = boardKey(board, toPlayAfter);
        if (seen.has(afterKey)) throw new Error("Passe ilegal: essa posição já aconteceu.");
        seen.add(afterKey);
      }
      if (player === "B") capturedWhite += captured;
      else capturedBlack += captured;
      nodes.push({
        ply,
        player,
        x: point === "pass" ? null : point.x,
        y: point === "pass" ? null : point.y,
        pass: point === "pass",
        label: point === "pass" ? "passe" : coordLabel(point.x, point.y, size),
        comment,
        board: cloneBoard(board),
        origins: cloneOrigins(origins),
        capturedBlack,
        capturedWhite,
      });
    } else if (comment && nodes.length) {
      nodes[nodes.length - 1]!.comment = [nodes[nodes.length - 1]!.comment, comment].filter(Boolean).join("\n");
      nodes[nodes.length - 1]!.board = cloneBoard(board);
      nodes[nodes.length - 1]!.origins = cloneOrigins(origins);
    }
    cursor = cursor.children[0] ?? null;
  }
  return {
    size,
    komi: Number.isFinite(komi) ? komi : 6.5,
    rules,
    black: prop(root, "PB") || "Preto",
    white: prop(root, "PW") || "Branco",
    result: prop(root, "RE"),
    event: prop(root, "EV"),
    date: prop(root, "DT"),
    name: prop(root, "GN"),
    nodes,
  };
}

function cleanComment(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
}

export function sgfFromMoves(args: {
  size: number;
  komi: number;
  black: string;
  white: string;
  result?: string;
  event?: string;
  name?: string;
  moves: string[];
}): string {
  const props = [
    "GM[1]",
    "FF[4]",
    `SZ[${args.size}]`,
    `KM[${args.komi}]`,
    "RU[Japanese]",
    `PB[${args.black}]`,
    `PW[${args.white}]`,
  ];
  if (args.result) props.push(`RE[${args.result}]`);
  if (args.event) props.push(`EV[${args.event}]`);
  if (args.name) props.push(`GN[${args.name}]`);
  const body = args.moves
    .map((move, index) => {
      const player = index % 2 === 0 ? "B" : "W";
      const point = parseGtp(move, args.size);
      if (point === "pass") return `;${player}[]`;
      const x = String.fromCharCode(97 + point.x);
      const y = String.fromCharCode(97 + point.y);
      return `;${player}[${x}${y}]`;
    })
    .join("");
  return `(;${props.join("")}${body})`;
}

export function appendMoveToGame(
  game: ParsedGame,
  point: { x: number; y: number } | "pass",
  fromPly?: number,
): ParsedGame {
  const baseIndex = fromPly !== undefined ? Math.min(fromPly, game.nodes.length - 1) : game.nodes.length - 1;
  const lastNode = game.nodes[baseIndex]!;
  const player = sideToPlay(lastNode, game.nodes[0]!);
  const nextBoard = cloneBoard(lastNode.board);
  const nextOrigins = cloneOrigins(lastNode.origins);
  const newPly = baseIndex + 1;
  let captured = 0;

  if (point !== "pass") {
    captured = playPoint(nextBoard, nextOrigins, point.x, point.y, player === "B" ? 1 : 2, newPly);
  }

  const newNode: GameNode = {
    ply: newPly,
    player,
    x: point === "pass" ? null : point.x,
    y: point === "pass" ? null : point.y,
    pass: point === "pass",
    label: point === "pass" ? "pass" : coordLabel(point.x, point.y, game.size),
    comment: "",
    board: nextBoard,
    origins: nextOrigins,
    capturedBlack: lastNode.capturedBlack + (player === "W" ? captured : 0),
    capturedWhite: lastNode.capturedWhite + (player === "B" ? captured : 0),
  };

  const nextNodes = [...game.nodes.slice(0, baseIndex + 1), newNode];

  return {
    ...game,
    nodes: nextNodes,
  };
}

export function gameToSgf(game: ParsedGame): string {
  const moves: string[] = [];
  for (let i = 1; i < game.nodes.length; i += 1) {
    const node = game.nodes[i]!;
    if (node.pass || node.x === null || node.y === null) {
      moves.push("pass");
    } else {
      moves.push(coordLabel(node.x, node.y, game.size));
    }
  }
  return sgfFromMoves({
    size: game.size,
    komi: game.komi,
    black: game.black,
    white: game.white,
    result: game.result,
    event: game.event,
    name: game.name,
    moves,
  });
}
