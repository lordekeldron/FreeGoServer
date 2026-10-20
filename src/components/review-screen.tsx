import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  Globe,
  Heart,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AccountButton } from "@/lib/auth/gates";
import { Goban } from "@/components/goban";
import { translations, type Language } from "@/lib/i18n";
import { GRADES, type GradeId } from "@/review/quality";
import { EMPTY_19, SAMPLES } from "@/review/samples";
import { sideToPlay, type Color } from "@/review/sgf";
import { useReview, type MoveGrade, type Suggestion } from "@/review/use-review";

const GRADE_TEXT_CLASS: Record<GradeId, string> = {
  excellent: "text-blue-600",
  great: "text-green-600",
  good: "text-lime-600",
  inaccuracy: "text-amber-600",
  mistake: "text-orange-600",
  blunder: "text-red-600",
};

const GRADE_BG_CLASS: Record<GradeId, string> = {
  excellent: "bg-blue-600",
  great: "bg-green-600",
  good: "bg-lime-600",
  inaccuracy: "bg-amber-600",
  mistake: "bg-orange-600",
  blunder: "bg-red-600",
};

function formatPoints(value: number, lang: Language): string {
  return value.toLocaleString(lang === "pt" ? "pt-BR" : "en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

export function ReviewScreen() {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fgs.lang");
      if (saved === "pt") setLang("pt");
    } catch {
      /* private mode */
    }
  }, []);

  const t = translations[lang];

  function toggleLanguage() {
    const nextLang: Language = lang === "en" ? "pt" : "en";
    setLang(nextLang);
    try {
      localStorage.setItem("fgs.lang", nextLang);
    } catch {
      /* private mode */
    }
  }

  const review = useReview(EMPTY_19);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [paste, setPaste] = useState("");
  const [showMarks, setShowMarks] = useState(true);
  const [showTerritory, setShowTerritory] = useState(true);
  const [hoveredSuggestion, setHoveredSuggestion] = useState<number | null>(null);
  const [pinnedSuggestion, setPinnedSuggestion] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  // Quick navigation table state: tracks expanded category & color
  const [expandedRow, setExpandedRow] = useState<{ gradeId: GradeId; player: Color } | null>(null);

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

  // Group moves by player and grade for the breakdown table
  const breakdown = useMemo(() => {
    const blackBuckets: Record<GradeId, Array<{ ply: number; label: string; loss: number }>> = {
      excellent: [],
      great: [],
      good: [],
      inaccuracy: [],
      mistake: [],
      blunder: [],
    };
    const whiteBuckets: Record<GradeId, Array<{ ply: number; label: string; loss: number }>> = {
      excellent: [],
      great: [],
      good: [],
      inaccuracy: [],
      mistake: [],
      blunder: [],
    };

    let totalBlack = 0;
    let totalWhite = 0;

    for (let i = 1; i < review.game.nodes.length; i += 1) {
      const n = review.game.nodes[i]!;
      const g = review.grades[i];
      if (!n.player || !g) continue;
      if (n.player === "B") {
        totalBlack += 1;
        blackBuckets[g.gradeId].push({ ply: i, label: n.label, loss: g.pointsLost });
      } else {
        totalWhite += 1;
        whiteBuckets[g.gradeId].push({ ply: i, label: n.label, loss: g.pointsLost });
      }
    }

    return {
      black: blackBuckets,
      white: whiteBuckets,
      totalBlack,
      totalWhite,
    };
  }, [review.game.nodes, review.grades]);

  const chart = useMemo(() => {
    return review.game.nodes.map((item, index) => ({
      ply: index,
      wr: review.evals[index] ? Math.round(review.evals[index]!.winRate * 1000) / 10 : null,
    }));
  }, [review.game, review.evals]);

  async function readFile(file: File) {
    const text = await file.text();
    review.loadSgf(text, file.name.replace(/\.sgf$/i, ""));
  }

  function leadSentence(lead: number): string {
    const abs = formatPoints(Math.abs(lead), lang);
    if (Math.abs(lead) < 0.15) return t.balancedPosition;
    return lead > 0
      ? t.blackAhead.replace("{points}", abs)
      : t.whiteAhead.replace("{points}", abs);
  }

  function getPlayerName(color: Color): string {
    return color === "B" ? t.black : t.white;
  }

  function describeMoveText(
    player: Color | null,
    label: string,
    gradeRow: MoveGrade | null,
    evalRow: { winRate: number; lead: number } | null | undefined,
  ): string {
    if (!player) return t.initialPosition;
    const who = getPlayerName(player);
    if (!gradeRow || !evalRow) {
      return t.measuringMove.replace("{player}", who).replace("{label}", label);
    }
    if (gradeRow.pointsLost < 0.05) {
      return t.maintainedEval.replace("{player}", who).replace("{label}", label);
    }
    return t.concededPoints
      .replace("{player}", who)
      .replace("{label}", label)
      .replace("{points}", formatPoints(gradeRow.pointsLost, lang));
  }

  const isGameEmpty = review.game.nodes.length <= 1;

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
      {/* Top progress bar */}
      <div className="h-1 bg-line" aria-hidden="true">
        <div
          className="h-full origin-left bg-pine transition-transform duration-300 ease-out"
          style={{
            transform: `scaleX(${
              review.phase === "ready" ? 1 : review.phase === "error" ? 0 : review.progress
            })`,
          }}
        />
      </div>

      {/* Main Header */}
      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-b border-line/60 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-pine text-paper shadow-sm">
            <span className="font-display text-xl font-bold">囲</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                {t.siteTitle}
              </h1>
              <span className="rounded-md border border-line bg-paper-2 px-2 py-0.5 text-[11px] font-medium tracking-wide text-ink-soft uppercase">
                AI KataGo
              </span>
            </div>
            <p className="text-xs text-muted">{t.siteTagline}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AccountButton language={lang} />

          {/* Donate Button */}
          <a
            href={
              lang === "en"
                ? "https://www.paypal.com/donate/?hosted_button_id=Y382V6364XNM8"
                : "https://www.paypal.com/donate/?hosted_button_id=G78Q5TTR2MDNL"
            }
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 sm:text-sm"
            title={t.donateTitle}
          >
            <Heart className="size-4 fill-white text-white" aria-hidden="true" />
            <span>{t.donate}</span>
          </a>

          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="btn-quiet flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium sm:text-sm"
            aria-label="Toggle language between English and Portuguese"
          >
            <Globe className="size-4 text-muted" aria-hidden="true" />
            <span className={lang === "en" ? "font-bold text-pine" : "text-muted"}>EN</span>
            <span className="text-muted">/</span>
            <span className={lang === "pt" ? "font-bold text-pine" : "text-muted"}>PT</span>
          </button>

          {/* SGF Actions */}
          <button
            type="button"
            className="btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden="true" />
            {t.openSgf}
          </button>

          <button
            type="button"
            className="btn-quiet px-3 py-1.5 text-xs sm:text-sm"
            onClick={() => setPasteOpen((value) => !value)}
          >
            {t.pasteSgf}
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

      {/* Board Controls Toolbar */}
      <section className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wider text-muted uppercase">
            {t.boardSize}:
          </span>
          <div className="inline-flex rounded-lg border border-line bg-paper-2 p-0.5">
            <button
              type="button"
              onClick={() => review.resetGame(19)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                review.game.size === 19
                  ? "bg-pine text-paper shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              19 × 19
            </button>
            <button
              type="button"
              onClick={() => review.resetGame(13)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                review.game.size === 13
                  ? "bg-pine text-paper shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              13 × 13
            </button>
            <button
              type="button"
              onClick={() => review.resetGame(9)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                review.game.size === 9
                  ? "bg-pine text-paper shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              9 × 9
            </button>
          </div>

          <button
            type="button"
            onClick={() => review.resetGame(review.game.size)}
            className="btn-quiet flex items-center gap-1 px-2.5 py-1 text-xs"
            title="Clear board back to initial state"
          >
            <RotateCcw className="size-3.5" />
            {t.newBoard}
          </button>
        </div>

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            className="btn-quiet flex items-center gap-1.5 px-2.5 py-1 text-xs"
            onClick={() => setSamplesOpen((v) => !v)}
          >
            <Sparkles className="size-3.5 text-amber-600" />
            <span>{t.samples}</span>
            <ChevronDown className="size-3.5" />
          </button>

          {samplesOpen ? (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-line bg-paper p-1.5 shadow-lg">
              {SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  className="flex w-full flex-col rounded-lg px-3 py-2 text-left text-xs transition-colors hover:bg-paper-2"
                  onClick={() => {
                    review.loadSgf(sample.sgf, sample.title);
                    setSamplesOpen(false);
                  }}
                >
                  <span className="font-medium text-ink">{sample.title}</span>
                  <span className="text-[11px] text-muted">{sample.detail}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* Drag & Drop overlay */}
      {dragging ? (
        <div className="pointer-events-none fixed inset-4 z-40 grid place-items-center rounded-2xl border-2 border-dashed border-pine bg-paper/95 shadow-2xl backdrop-blur-xs">
          <p className="font-display text-2xl font-medium text-pine">{t.dropSgf}</p>
        </div>
      ) : null}

      {/* Main Content Grid */}
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem]">
        {/* Left Column: Board and Win Rate Chart */}
        <section className="min-w-0">
          <div className="rounded-2xl border border-line/70 bg-paper-2 p-3 shadow-xs sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
              <div>
                <p className="font-display text-xl font-semibold leading-tight text-ink">
                  {review.sourceName}
                </p>
                <p className="text-xs text-muted">
                  {review.game.black} × {review.game.white}
                  {review.game.result ? ` · ${review.game.result}` : ""}
                  {` · komi ${review.game.komi.toLocaleString(lang === "pt" ? "pt-BR" : "en-US")}`}
                  {` · ${review.game.size}×${review.game.size}`}
                </p>
              </div>

              {isGameEmpty ? (
                <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-medium text-pine">
                  {lang === "pt" ? "Tabuleiro Vazio" : "Empty Board"}
                </span>
              ) : null}
            </div>

            {/* Paste Modal/Drawer */}
            {pasteOpen ? (
              <form
                className="mb-4 rounded-xl border border-line bg-paper p-3.5 shadow-sm"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (paste.trim()) {
                    review.loadSgf(paste.trim(), lang === "pt" ? "Partida colada" : "Pasted game");
                    setPasteOpen(false);
                    setPaste("");
                  }
                }}
              >
                <label className="text-xs font-medium text-ink-soft" htmlFor="sgf-paste">
                  {t.pasteLabel}
                </label>
                <textarea
                  id="sgf-paste"
                  value={paste}
                  onChange={(event) => setPaste(event.target.value)}
                  rows={4}
                  className="mt-1 w-full resize-y rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink outline-none focus-visible:ring-2 focus-visible:ring-pine"
                  placeholder="(;GM[1]FF[4]SZ[19]…"
                />
                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    className="btn-quiet px-3 py-1 text-xs"
                    onClick={() => setPasteOpen(false)}
                  >
                    {t.cancel}
                  </button>
                  <button type="submit" className="btn-primary px-3 py-1 text-xs">
                    {t.loadButton}
                  </button>
                </div>
              </form>
            ) : null}

            {review.parseError ? (
              <p
                className="mb-3 rounded-lg border border-red-500/30 bg-red-50 px-3 py-2 text-xs text-red-600"
                role="alert"
              >
                {review.parseError}
              </p>
            ) : null}

            {/* Goban Board */}
            <div className="mx-auto w-full max-w-[43rem]">
              <Goban
                game={review.game}
                language={lang}
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
                onPlayPoint={(x, y) => review.playMove(x, y)}
              />
            </div>

            {/* Board Navigation Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <IconButton label={t.start} onClick={() => review.setCursor(0)}>
                <ChevronsLeft className="size-5" />
              </IconButton>
              <IconButton
                label={t.prevMove}
                onClick={() => review.setCursor((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft className="size-5" />
              </IconButton>

              <div className="flex min-w-28 items-center justify-center rounded-lg border border-line bg-paper px-3 py-1.5 text-center text-sm font-semibold tabular-nums text-ink">
                {review.cursor} / {Math.max(0, review.game.nodes.length - 1)}
              </div>

              <IconButton
                label={t.nextMove}
                onClick={() =>
                  review.setCursor((value) =>
                    Math.min(review.game.nodes.length - 1, value + 1),
                  )
                }
              >
                <ChevronRight className="size-5" />
              </IconButton>
              <IconButton
                label={t.end}
                onClick={() => review.setCursor(review.game.nodes.length - 1)}
              >
                <ChevronsRight className="size-5" />
              </IconButton>

              <button
                type="button"
                onClick={() => review.playPass()}
                className="btn-quiet ml-2 px-3 py-1.5 text-xs font-medium"
                title="Play a pass move for current player"
              >
                {t.pass}
              </button>
            </div>

            {/* Engine status indicator & marks/territory toggles */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs text-muted">
              <p aria-live="polite">
                {review.phase === "loading"
                  ? t.readingKataGo
                      .replace(
                        "{current}",
                        String(Math.round(review.progress * review.game.nodes.length)),
                      )
                      .replace("{total}", String(review.game.nodes.length))
                  : review.phase === "error"
                    ? t.readingStopped
                    : review.suggesting
                      ? t.seekingAlternatives
                      : `KataGo ${review.modelName ?? "WASM"} · client-side`}
              </p>
              <div className="flex gap-1.5">
                <Toggle
                  pressed={showMarks}
                  onClick={() => setShowMarks((value) => !value)}
                  label={t.marks}
                />
                <Toggle
                  pressed={showTerritory}
                  onClick={() => setShowTerritory((value) => !value)}
                  label={t.territory}
                />
              </div>
            </div>
          </div>

        </section>

        {/* Right Column: Player Cards, Move Quality Breakdown Table, Alternatives */}
        <aside className="flex min-w-0 flex-col gap-4">
          {/* Player stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <PlayerCard
              title={t.black}
              color="B"
              name={review.game.black}
              accuracy={review.summary.black}
              captures={node.capturedWhite}
              accuracyLabel={t.accuracy}
              capturesLabel={t.captures}
            />
            <PlayerCard
              title={t.white}
              color="W"
              name={review.game.white}
              accuracy={review.summary.white}
              captures={node.capturedBlack}
              accuracyLabel={t.accuracy}
              capturesLabel={t.captures}
            />
          </div>

          {/* REQUIREMENT 9: Move Quality Breakdown Table matching image.png */}
          <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-xs">
            <div className="border-b border-line/60 bg-paper-2/60 px-4 py-3">
              <h2 className="font-display text-base font-semibold leading-tight text-ink">
                {t.movesBreakdown}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">{t.clickToFilter}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line/70 bg-paper-2 text-[11px] font-semibold text-muted uppercase">
                    <th className="py-2.5 pr-2 pl-4">{t.tipo}</th>
                    <th className="px-2 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                        <span className="size-2.5 rounded-full bg-stone-900 ring-1 ring-stone-950" />
                        {t.pretas}
                      </span>
                    </th>
                    <th className="px-2 py-2.5 text-right font-medium text-muted">%</th>
                    <th className="px-2 py-2.5 text-center">
                      <span className="inline-flex items-center gap-1.5 font-bold text-ink">
                        <span className="size-2.5 rounded-full border border-stone-400 bg-stone-100" />
                        {t.brancas}
                      </span>
                    </th>
                    <th className="py-2.5 pr-4 pl-2 text-right font-medium text-muted">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {GRADES.map((item) => {
                    const blackMoves = breakdown.black[item.id];
                    const whiteMoves = breakdown.white[item.id];
                    const blackCount = blackMoves.length;
                    const whiteCount = whiteMoves.length;
                    const blackPct =
                      breakdown.totalBlack > 0
                        ? ((blackCount / breakdown.totalBlack) * 100).toFixed(1)
                        : "0.0";
                    const whitePct =
                      breakdown.totalWhite > 0
                        ? ((whiteCount / breakdown.totalWhite) * 100).toFixed(1)
                        : "0.0";

                    const isBlackOpen =
                      expandedRow?.gradeId === item.id && expandedRow?.player === "B";
                    const isWhiteOpen =
                      expandedRow?.gradeId === item.id && expandedRow?.player === "W";

                    return (
                      <tr key={item.id} className="group hover:bg-paper-2/50">
                        {/* TYPE label with color indicator bar */}
                        <td className="relative py-2.5 pr-2 pl-4">
                          <span
                            className={`absolute inset-y-1 left-0 w-1 rounded-r-sm ${GRADE_BG_CLASS[item.id]}`}
                          />
                          <div className="flex items-center gap-2">
                            <span
                              className={`size-2.5 shrink-0 rounded-full ${GRADE_BG_CLASS[item.id]}`}
                            />
                            <span className="font-semibold text-ink">
                              {lang === "pt" ? item.label : item.labelEn}
                            </span>
                          </div>
                        </td>

                        {/* BLACK count & dropdown trigger */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            disabled={blackCount === 0}
                            onClick={() =>
                              setExpandedRow((prev) =>
                                prev?.gradeId === item.id && prev?.player === "B"
                                  ? null
                                  : { gradeId: item.id, player: "B" },
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors ${
                              blackCount > 0
                                ? "bg-paper-2 text-ink hover:bg-line/60"
                                : "cursor-default text-muted/50"
                            } ${isBlackOpen ? "ring-2 ring-pine" : ""}`}
                            title={`View Black's ${item.label} moves`}
                          >
                            <span>{blackCount}</span>
                            {blackCount > 0 ? (
                              isBlackOpen ? (
                                <ChevronUp className="size-3 text-muted" />
                              ) : (
                                <ChevronDown className="size-3 text-muted" />
                              )
                            ) : null}
                          </button>
                        </td>

                        {/* BLACK % */}
                        <td className="px-2 py-2 text-right tabular-nums text-muted">
                          {blackPct}%
                        </td>

                        {/* WHITE count & dropdown trigger */}
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            disabled={whiteCount === 0}
                            onClick={() =>
                              setExpandedRow((prev) =>
                                prev?.gradeId === item.id && prev?.player === "W"
                                  ? null
                                  : { gradeId: item.id, player: "W" },
                              )
                            }
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums transition-colors ${
                              whiteCount > 0
                                ? "bg-paper-2 text-ink hover:bg-line/60"
                                : "cursor-default text-muted/50"
                            } ${isWhiteOpen ? "ring-2 ring-pine" : ""}`}
                            title={`View White's ${item.label} moves`}
                          >
                            <span>{whiteCount}</span>
                            {whiteCount > 0 ? (
                              isWhiteOpen ? (
                                <ChevronUp className="size-3 text-muted" />
                              ) : (
                                <ChevronDown className="size-3 text-muted" />
                              )
                            ) : null}
                          </button>
                        </td>

                        {/* WHITE % */}
                        <td className="py-2 pr-4 pl-2 text-right tabular-nums text-muted">
                          {whitePct}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick jump navigation chips when a row/player is expanded */}
            {expandedRow ? (
              <div className="border-t border-line/70 bg-paper-2 p-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    {expandedRow.player === "B" ? t.black : t.white} ·{" "}
                    {lang === "pt"
                      ? GRADES.find((g) => g.id === expandedRow.gradeId)?.label
                      : GRADES.find((g) => g.id === expandedRow.gradeId)?.labelEn}{" "}
                    (
                    {expandedRow.player === "B"
                      ? breakdown.black[expandedRow.gradeId].length
                      : breakdown.white[expandedRow.gradeId].length}
                    )
                  </span>
                  <button
                    type="button"
                    onClick={() => setExpandedRow(null)}
                    className="text-[11px] text-muted hover:text-ink"
                  >
                    ✕ {t.cancel}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(expandedRow.player === "B"
                    ? breakdown.black[expandedRow.gradeId]
                    : breakdown.white[expandedRow.gradeId]
                  ).map((m) => {
                    const isSelected = review.cursor === m.ply;
                    return (
                      <button
                        key={m.ply}
                        type="button"
                        onClick={() => review.setCursor(m.ply)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                          isSelected
                            ? "border-pine bg-pine text-paper shadow-xs"
                            : "border-line bg-paper text-ink hover:bg-paper-2"
                        }`}
                      >
                        <span className="font-mono text-muted">#{m.ply}</span>
                        <span>{m.label}</span>
                        <span className="text-[10px] tabular-nums opacity-70">
                          (−{formatPoints(m.loss, lang)})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Win Rate Area Chart */}
          <div className="h-44 rounded-2xl border border-line bg-paper p-3 shadow-xs">
            <p className="px-1 text-xs font-medium text-muted">{t.blackWinRate}</p>
            {chartReady ? (
              <ResponsiveContainer width="100%" height="86%">
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
                    formatter={(value) => [`${value}%`, t.black]}
                    labelFormatter={(label) => t.moveLabel.replace("{label}", String(label))}
                    contentStyle={{
                      background: "var(--color-paper)",
                      border: "1px solid var(--color-line)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <ReferenceLine y={50} stroke="var(--color-line)" strokeDasharray="3 3" />
                  <ReferenceLine x={review.cursor} stroke="var(--color-pine)" strokeWidth={2} />
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

          {/* Current move evaluation card */}
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold leading-tight text-ink">
                {t.thisMove}
              </h2>
              {node.player ? (
                <span className="font-mono text-xs font-semibold text-muted">
                  #{review.cursor} {node.label}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {describeMoveText(node.player, node.label, grade, review.evals[review.cursor])}
            </p>
            {grade ? (
              <p className={`mt-2 text-xs font-semibold ${GRADE_TEXT_CLASS[grade.gradeId]}`}>
                {lang === "pt"
                  ? GRADES.find((item) => item.id === grade.gradeId)?.label
                  : GRADES.find((item) => item.id === grade.gradeId)?.labelEn}{" "}
                · −{formatPoints(grade.pointsLost, lang)} {lang === "pt" ? "pontos" : "points"}
              </p>
            ) : null}
            {review.evals[review.cursor] ? (
              <p className="mt-1 text-xs tabular-nums text-muted">
                {leadSentence(review.evals[review.cursor]!.lead)} · {t.black}{" "}
                {Math.round(review.evals[review.cursor]!.winRate * 100)}%
              </p>
            ) : null}
            {node.comment ? (
              <p className="mt-3 rounded-lg bg-paper-2 p-2.5 text-xs leading-relaxed text-ink">
                {node.comment}
              </p>
            ) : null}
          </div>

          {/* KataGo error fallback */}
          {review.engineError ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-50/50 p-4">
              <p className="text-xs text-red-600">{review.engineError}</p>
              <button
                type="button"
                className="btn-quiet mt-3 text-xs"
                onClick={() => void review.retry()}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {t.retry}
              </button>
            </div>
          ) : null}

          {/* Suggestions for side to play */}
          <div className="rounded-2xl border border-line bg-paper p-4 shadow-xs">
            <h2 className="font-display text-base font-semibold leading-tight text-ink">
              {t.toPlay.replace("{player}", getPlayerName(side))}
            </h2>
            <ul className="mt-3 grid gap-1.5">
              {review.suggestions.length === 0 ? (
                <li className="text-xs text-muted">
                  {review.phase === "ready" ? t.noAlternativesReady : t.noAlternativesYet}
                </li>
              ) : (
                review.suggestions.map((suggestion) => (
                  <SuggestionRow
                    key={suggestion.id}
                    suggestion={suggestion}
                    active={suggestion.id === activeId}
                    lang={lang}
                    bestLabel={t.best}
                    onEnter={() => setHoveredSuggestion(suggestion.id)}
                    onLeave={() => setHoveredSuggestion(null)}
                    onClick={() =>
                      setPinnedSuggestion((value) =>
                        value === suggestion.id ? null : suggestion.id,
                      )
                    }
                  />
                ))
              )}
            </ul>
          </div>

          <p className="px-1 text-[11px] leading-relaxed text-muted">{t.engineCredits}</p>
        </aside>
      </main>
    </div>
  );
}

function PlayerCard({
  title,
  color,
  name,
  accuracy,
  captures,
  accuracyLabel,
  capturesLabel,
}: {
  title: string;
  color: Color;
  name: string;
  accuracy: number | null;
  captures: number;
  accuracyLabel: string;
  capturesLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`size-3 rounded-full ${
            color === "B"
              ? "bg-stone-900 ring-1 ring-stone-950"
              : "border border-stone-400 bg-stone-100"
          }`}
        />
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">{title}</p>
      </div>
      <p className="mt-1 truncate font-display text-base font-semibold text-ink">{name}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
        {accuracy == null ? "—" : `${accuracy}%`}
        <span className="ml-1 text-xs font-normal text-muted">{accuracyLabel}</span>
      </p>
      <p className="mt-1 text-xs text-muted">
        {captures} {capturesLabel}
      </p>
    </div>
  );
}

function SuggestionRow({
  suggestion,
  active,
  lang,
  bestLabel,
  onEnter,
  onLeave,
  onClick,
}: {
  suggestion: Suggestion;
  active: boolean;
  lang: Language;
  bestLabel: string;
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
        className={`flex min-h-10 w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 text-left text-xs transition-colors ${
          active ? "border-line bg-paper-2" : "hover:bg-paper-2/70"
        }`}
      >
        <span
          className={`grid size-6 place-items-center rounded-full text-[11px] font-bold text-white shadow-xs ${GRADE_BG_CLASS[grade.id]}`}
        >
          {String.fromCharCode(65 + suggestion.id)}
        </span>
        <span className="font-semibold text-ink">{suggestion.label}</span>
        <span className="text-[11px] text-muted">
          ({(suggestion.winRate * 100).toFixed(1)}%)
        </span>
        <span className="ml-auto font-medium tabular-nums text-muted">
          {suggestion.pointsLost < 0.05
            ? bestLabel
            : `−${formatPoints(suggestion.pointsLost, lang)}`}
        </span>
      </button>
    </li>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="btn-quiet grid size-10 place-items-center rounded-xl p-0 transition-colors hover:bg-paper-2"
    >
      {children}
    </button>
  );
}

function Toggle({
  pressed,
  onClick,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
        pressed ? "border-pine bg-pine text-paper" : "border-line text-ink-soft hover:bg-paper"
      }`}
    >
      {label}
    </button>
  );
}
