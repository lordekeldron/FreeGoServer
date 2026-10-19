import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Upload,
} from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Goban } from "@/components/goban";
import { GRADES, type GradeId } from "@/review/quality";
import { DEFAULT_SAMPLE, SAMPLES } from "@/review/samples";
import { sideToPlay, type Color } from "@/review/sgf";
import { useReview, type MoveGrade, type Suggestion } from "@/review/use-review";

const GRADE_TEXT: Record<GradeId, string> = {
  excellent: "text-excellent",
  good: "text-good",
  inaccuracy: "text-inaccuracy",
  mistake: "text-mistake",
  blunder: "text-blunder",
};

const GRADE_BG: Record<GradeId, string> = {
  excellent: "bg-excellent",
  good: "bg-good",
  inaccuracy: "bg-inaccuracy",
  mistake: "bg-mistake",
  blunder: "bg-blunder",
};

function formatPoints(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function leadSentence(lead: number): string {
  const abs = formatPoints(Math.abs(lead));
  if (Math.abs(lead) < 0.15) return "Posição equilibrada";
  return lead > 0 ? `Pretas à frente por ${abs}` : `Brancas à frente por ${abs}`;
}

function playerName(color: Color): string {
  return color === "B" ? "Preto" : "Branco";
}

export function ReviewScreen() {
  const review = useReview(DEFAULT_SAMPLE.sgf);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [showMarks, setShowMarks] = useState(true);
  const [showTerritory, setShowTerritory] = useState(true);
  const [enabled, setEnabled] = useState<GradeId[]>(GRADES.map((grade) => grade.id));
  const [hoveredSuggestion, setHoveredSuggestion] = useState<number | null>(null);
  const [pinnedSuggestion, setPinnedSuggestion] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => setChartReady(true), []);
  useEffect(() => {
    setHoveredSuggestion(null);
    setPinnedSuggestion(null);
  }, [review.cursor, review.game]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        review.setCursor((value) => Math.min(review.game.nodes.length - 1, value + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        review.setCursor((value) => Math.max(0, value - 1));
      } else if (event.key === "Home") {
        review.setCursor(0);
      } else if (event.key === "End") {
        review.setCursor(review.game.nodes.length - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [review]);

  const node = review.game.nodes[review.cursor] ?? review.game.nodes[0]!;
  const grade = review.grades[review.cursor] ?? null;
  const side = sideToPlay(node, review.game.nodes[0]!);
  const activeId = hoveredSuggestion ?? pinnedSuggestion;
  const active = review.suggestions.find((suggestion) => suggestion.id === activeId) ?? null;
  const ghosts = active?.pv ?? [];

  const counts = useMemo(() => {
    const tally = Object.fromEntries(GRADES.map((item) => [item.id, 0])) as Record<GradeId, number>;
    for (const row of review.grades) if (row) tally[row.gradeId] += 1;
    return tally;
  }, [review.grades]);

  const chart = useMemo(() => {
    return review.game.nodes.map((item, index) => ({
      ply: index,
      wr: review.evals[index] ? Math.round(review.evals[index]!.winRate * 1000) / 10 : null,
    }));
  }, [review.game, review.evals]);

  const visibleMoves = review.game.nodes.filter((item, index) => {
    if (index === 0) return false;
    const row = review.grades[index];
    if (!row) return true;
    return enabled.includes(row.gradeId);
  });

  async function readFile(file: File) {
    const text = await file.text();
    review.loadSgf(text, file.name.replace(/\.sgf$/i, ""));
  }

  return (
    <div
      className="min-h-screen bg-paper text-ink"
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) void readFile(file);
      }}
    >
      <div className="h-1 bg-line" aria-hidden="true">
        <div
          className="h-full origin-left bg-pine transition-transform duration-300 ease-out"
          style={{ transform: `scaleX(${review.phase === "ready" ? 1 : review.phase === "error" ? 0 : review.progress})` }}
        />
      </div>
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-4 py-5 sm:px-6">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">Revisão de Go</p>
          <h1 className="font-display text-4xl leading-none font-medium tracking-tight text-ink sm:text-5xl">Honbo</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
            A rede KataGo lê a partida no seu navegador e separa cada lance em excelente, bom, imprecisão, erro ou erro grosseiro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" />
            Abrir SGF
          </button>
          <button type="button" className="btn-quiet" onClick={() => setPasteOpen((value) => !value)}>
            Colar SGF
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".sgf,text/plain"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {dragging ? (
        <div className="pointer-events-none fixed inset-4 z-20 grid place-items-center rounded-xl border border-dashed border-pine bg-paper/90">
          <p className="font-display text-2xl">Solte o arquivo SGF</p>
        </div>
      ) : null}

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="rounded-xl bg-paper-2 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-xl leading-tight">{review.sourceName}</p>
                <p className="text-sm text-muted">
                  {review.game.black} × {review.game.white}
                  {review.game.result ? ` · ${review.game.result}` : ""}
                  {` · komi ${review.game.komi.toLocaleString("pt-BR")}`}
                  {` · ${review.game.size}×${review.game.size}`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className="btn-quiet"
                    onClick={() => review.loadSgf(sample.sgf, sample.title)}
                  >
                    {sample.title}
                  </button>
                ))}
              </div>
            </div>
            {pasteOpen ? (
              <form
                className="mb-3 grid gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  review.loadSgf(paste, "Partida colada");
                  setPasteOpen(false);
                }}
              >
                <label className="text-sm text-ink-soft" htmlFor="sgf-paste">
                  Cole o SGF completo
                </label>
                <textarea
                  id="sgf-paste"
                  value={paste}
                  onChange={(event) => setPaste(event.target.value)}
                  rows={5}
                  className="w-full resize-y rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-pine"
                  placeholder="(;GM[1]FF[4]SZ[19]…"
                />
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary">
                    Ler partida
                  </button>
                </div>
              </form>
            ) : null}
            {review.parseError ? (
              <p className="mb-3 rounded-md border border-blunder/30 bg-paper px-3 py-2 text-sm text-blunder" role="alert">
                {review.parseError}
              </p>
            ) : null}
            <div className="mx-auto w-full max-w-[42rem]">
              <Goban
                game={review.game}
                cursor={review.cursor}
                gradeIds={review.grades.map((row) => row?.gradeId ?? null)}
                suggestions={review.suggestions}
                ownership={review.ownership}
                showMarks={showMarks}
                showTerritory={showTerritory && review.ownership != null}
                ghosts={ghosts}
                activeSuggestion={activeId}
                onJump={review.setCursor}
                onHoverSuggestion={setHoveredSuggestion}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <IconButton label="Início" onClick={() => review.setCursor(0)}>
                <ChevronsLeft className="size-5" />
              </IconButton>
              <IconButton label="Lance anterior" onClick={() => review.setCursor((value) => Math.max(0, value - 1))}>
                <ChevronLeft className="size-5" />
              </IconButton>
              <p className="min-w-24 text-center text-sm tabular-nums text-ink-soft">
                {review.cursor} / {review.game.nodes.length - 1}
              </p>
              <IconButton
                label="Próximo lance"
                onClick={() => review.setCursor((value) => Math.min(review.game.nodes.length - 1, value + 1))}
              >
                <ChevronRight className="size-5" />
              </IconButton>
              <IconButton label="Final" onClick={() => review.setCursor(review.game.nodes.length - 1)}>
                <ChevronsRight className="size-5" />
              </IconButton>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
              <p className="text-muted" aria-live="polite">
                {review.phase === "loading"
                  ? `Lendo a rede KataGo · ${Math.round(review.progress * (review.game.nodes.length))} de ${review.game.nodes.length}`
                  : review.phase === "error"
                    ? "A leitura parou antes do fim."
                    : review.suggesting
                      ? "Buscando alternativas neste lance…"
                      : `Rede ${review.modelName ?? "KataGo"} · nada sai do navegador`}
              </p>
              <div className="flex gap-2">
                <Toggle pressed={showMarks} onClick={() => setShowMarks((value) => !value)} label="Marcas" />
                <Toggle pressed={showTerritory} onClick={() => setShowTerritory((value) => !value)} label="Território" />
              </div>
            </div>
          </div>

          <div className="mt-4 h-44 rounded-xl border border-line bg-paper px-2 py-3 sm:px-4">
            <p className="px-2 text-sm text-muted">Taxa de vitória das pretas</p>
            {chartReady ? (
              <ResponsiveContainer width="100%" height="84%">
                <AreaChart
                  data={chart}
                  onClick={(state) => {
                    const index = state?.activeTooltipIndex;
                    if (typeof index === "number") review.setCursor(index);
                  }}
                >
                  <XAxis dataKey="ply" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Pretas"]}
                    labelFormatter={(label) => `Lance ${label}`}
                    contentStyle={{
                      background: "var(--color-paper)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                  />
                  <ReferenceLine y={50} stroke="var(--color-line)" />
                  <ReferenceLine x={review.cursor} stroke="var(--color-pine)" />
                  <Area
                    type="monotone"
                    dataKey="wr"
                    stroke="var(--color-pine)"
                    fill="var(--color-pine)"
                    fillOpacity={0.16}
                    strokeWidth={2}
                    connectNulls
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <PlayerCard
              title="Pretas"
              name={review.game.black}
              accuracy={review.summary.black}
              captures={node.capturedWhite}
            />
            <PlayerCard
              title="Brancas"
              name={review.game.white}
              accuracy={review.summary.white}
              captures={node.capturedBlack}
            />
          </div>

          <div className="rounded-xl border border-line p-4">
            <h2 className="font-display text-lg leading-tight">Este lance</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{describeMove(node.player, node.label, grade, review.evals[review.cursor])}</p>
            {grade ? (
              <p className={`mt-2 text-sm font-medium ${GRADE_TEXT[grade.gradeId]}`}>
                {GRADES.find((item) => item.id === grade.gradeId)?.label} · {formatPoints(grade.pointsLost)} pontos
              </p>
            ) : null}
            {review.evals[review.cursor] ? (
              <p className="mt-1 text-sm tabular-nums text-muted">
                {leadSentence(review.evals[review.cursor]!.lead)} · pretas com{" "}
                {Math.round(review.evals[review.cursor]!.winRate * 100)}%
              </p>
            ) : null}
            {node.comment ? <p className="mt-3 text-sm leading-relaxed text-ink">{node.comment}</p> : null}
          </div>

          {review.engineError ? (
            <div className="rounded-xl border border-blunder/30 p-4">
              <p className="text-sm text-blunder">{review.engineError}</p>
              <button type="button" className="btn-quiet mt-3" onClick={() => void review.retry()}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Tentar de novo
              </button>
            </div>
          ) : null}

          <div className="rounded-xl border border-line p-4">
            <h2 className="font-display text-lg leading-tight">
              {playerName(side)} a jogar
            </h2>
            <ul className="mt-3 grid gap-2">
              {review.suggestions.length === 0 ? (
                <li className="text-sm text-muted">
                  {review.phase === "ready" ? "Sem alternativas ainda." : "As alternativas aparecem depois da leitura."}
                </li>
              ) : (
                review.suggestions.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    active={suggestion.id === activeId}
                    onEnter={() => setHoveredSuggestion(suggestion.id)}
                    onLeave={() => setHoveredSuggestion(null)}
                    onClick={() => setPinnedSuggestion((value) => (value === suggestion.id ? null : suggestion.id))}
                  />
                ))
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-line p-4">
            <h2 className="font-display text-lg leading-tight">Lances</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {GRADES.map((item) => {
                const on = enabled.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setEnabled((current) => {
                        const has = current.includes(item.id);
                        const next = has ? current.filter((id) => id !== item.id) : [...current, item.id];
                        return next.length ? next : GRADES.map((grade) => grade.id);
                      })
                    }
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-ink bg-ink text-paper" : "border-line bg-paper text-ink-soft"}`}
                  >
                    <span className={`size-2.5 rounded-full ${GRADE_BG[item.id]}`} aria-hidden="true" />
                    {item.plural}
                    <span className="tabular-nums">{counts[item.id]}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              A perda é a queda da vantagem em pontos, do lance jogado para a posição seguinte. Excelente abaixo de 1;
              bom até 2,5; imprecisão até 5; erro até 10; acima disso, erro grosseiro.
            </p>
            <ol className="mt-3 max-h-80 overflow-auto">
              {visibleMoves.map((item) => {
                const row = review.grades[item.ply];
                const selected = item.ply === review.cursor;
                return (
                  <li key={item.ply}>
                    <button
                      type="button"
                      onClick={() => review.setCursor(item.ply)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm ${selected ? "bg-ink text-paper" : "hover:bg-paper-2"}`}
                    >
                      <span className="w-8 tabular-nums text-muted">{item.ply}</span>
                      <span className="w-14">{item.player === "B" ? "Preto" : "Branco"}</span>
                      <span className="w-12 font-medium">{item.label}</span>
                      <span className={`ml-auto ${selected ? "text-paper" : row ? GRADE_TEXT[row.gradeId] : "text-muted"}`}>
                        {row ? GRADES.find((grade) => grade.id === row.gradeId)?.label : "…"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Motor KataGo, rede compacta g170-b6c96, executada com TensorFlow.js. A avaliação de cada lance compara a
            vantagem antes e depois; o lance em foco ainda recebe uma busca curta para mostrar alternativas. Adaptado
            do Web KaTrain.
          </p>
        </aside>
      </main>
    </div>
  );
}

function describeMove(
  player: Color | null,
  label: string,
  grade: MoveGrade | null,
  evalRow: { winRate: number; lead: number } | null | undefined,
): string {
  if (!player) return "Posição inicial, antes do primeiro lance.";
  const who = playerName(player);
  if (!grade || !evalRow) return `${who} jogou ${label}. A rede ainda está medindo este lance.`;
  if (grade.pointsLost < 0.05) return `${who} jogou ${label} e manteve a avaliação.`;
  return `${who} jogou ${label} e cedeu ${formatPoints(grade.pointsLost)} pontos.`;
}

function PlayerCard({
  title,
  name,
  accuracy,
  captures,
}: {
  title: string;
  name: string;
  accuracy: number | null;
  captures: number;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-xs tracking-[0.14em] text-muted uppercase">{title}</p>
      <p className="mt-1 truncate font-display text-xl leading-tight">{name}</p>
      <p className="mt-3 text-3xl tabular-nums leading-none font-medium">
        {accuracy == null ? "—" : accuracy}
        <span className="ml-1 text-sm font-normal text-muted">precisão</span>
      </p>
      <p className="mt-2 text-sm text-muted">{captures} capturas</p>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  active,
  onEnter,
  onLeave,
  onClick,
}: {
  suggestion: Suggestion;
  active: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const grade = GRADES.find((item) => suggestion.pointsLost < item.max) ?? GRADES[GRADES.length - 1]!;
  return (
    <li>
      <button
        type="button"
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        onClick={onClick}
        className={`flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm ${active ? "bg-paper-2" : ""}`}
      >
        <span className={`grid size-7 place-items-center rounded-full text-xs text-paper ${GRADE_BG[grade.id]}`}>
          {String.fromCharCode(65 + suggestion.id)}
        </span>
        <span className="font-medium">{suggestion.label}</span>
        <span className="ml-auto tabular-nums text-muted">
          {suggestion.pointsLost < 0.05 ? "melhor" : `−${formatPoints(suggestion.pointsLost)}`}
        </span>
      </button>
    </li>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="btn-quiet grid size-11 place-items-center p-0">
      {children}
    </button>
  );
}

function Toggle({ pressed, onClick, label }: { pressed: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 rounded-full border px-3 ${pressed ? "border-pine bg-pine text-paper" : "border-line text-ink-soft"}`}
    >
      {label}
    </button>
  );
}
