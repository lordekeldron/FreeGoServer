import { useState } from "react";
import { gradeFor, type GradeId } from "@/review/quality";
import type { Suggestion } from "@/review/use-review";
import { coordLabel, type Color, type ParsedGame } from "@/review/sgf";

const GRADE_COLOR: Record<GradeId, string> = {
  excellent: "var(--color-excellent)",
  great: "var(--color-great)",
  good: "var(--color-good)",
  inaccuracy: "var(--color-inaccuracy)",
  mistake: "var(--color-mistake)",
  blunder: "var(--color-blunder)",
};

function stars(size: number): Array<[number, number]> {
  if (size === 9) return [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]];
  if (size === 13) return [[3, 3], [3, 9], [6, 6], [9, 3], [9, 9]];
  const points = [3, 9, 15];
  const all: Array<[number, number]> = [];
  for (const y of points) for (const x of points) all.push([x, y]);
  return all;
}

type Ghost = { x: number; y: number; player: Color };

type GobanProps = {
  game: ParsedGame;
  language: "en" | "pt";
  cursor: number;
  gradeIds: Array<GradeId | null>;
  suggestions: Suggestion[];
  ownership: number[] | null;
  showMarks: boolean;
  showTerritory: boolean;
  ghosts: Ghost[];
  activeSuggestion: number | null;
  onJump: (ply: number) => void;
  onHoverSuggestion: (id: number | null) => void;
  onPlayPoint?: (x: number, y: number) => void;
};

export function Goban({
  game,
  language,
  cursor,
  gradeIds,
  suggestions,
  ownership,
  showMarks,
  showTerritory,
  ghosts,
  activeSuggestion,
  onJump,
  onHoverSuggestion,
  onPlayPoint,
}: GobanProps) {
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const node = game.nodes[cursor] ?? game.nodes[0]!;
  const size = game.size;
  const margin = 0.95;
  const view = size - 1 + margin * 2;

  return (
    <div className="w-full">
      <div className="mb-2 min-h-5 text-center text-sm font-semibold tabular-nums text-ink" aria-live="polite">
        {hover ? `${language === "pt" ? "Coordenada" : "Coordinate"}: ${coordLabel(hover.x, hover.y, size)}` : null}
      </div>
      <svg
      viewBox={`${-margin} ${-margin} ${view} ${view}`}
      className="h-auto w-full touch-none select-none"
      role="img"
      aria-label={`Tabuleiro ${size} por ${size}, lance ${cursor} de ${game.nodes.length - 1}`}
      onMouseLeave={() => {
        setHover(null);
        onHoverSuggestion(null);
      }}
    >
      <defs>
        <radialGradient id="honbo-black" cx="32%" cy="28%" r="75%">
          <stop offset="0%" stopColor="var(--color-stone-black-hi)" />
          <stop offset="48%" stopColor="var(--color-stone-black)" />
          <stop offset="100%" stopColor="var(--color-ink)" />
        </radialGradient>
        <radialGradient id="honbo-white" cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="var(--color-stone-white-hi)" />
          <stop offset="70%" stopColor="var(--color-stone-white)" />
          <stop offset="100%" stopColor="var(--color-stone-white-edge)" />
        </radialGradient>
        <filter id="honbo-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0.03" dy="0.05" stdDeviation="0.04" floodColor="var(--color-ink)" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect
        x={-margin}
        y={-margin}
        width={view}
        height={view}
        rx={0.35}
        fill="var(--color-wood)"
      />
      <rect x={-0.55} y={-0.55} width={size - 1 + 1.1} height={size - 1 + 1.1} fill="var(--color-wood-deep)" opacity="0.28" />
      {Array.from({ length: size }, (_, i) => (
        <g key={`line-${i}`} stroke="var(--color-ink)" strokeOpacity="0.72" strokeWidth="0.035">
          <line x1={i} y1={0} x2={i} y2={size - 1} />
          <line x1={0} y1={i} x2={size - 1} y2={i} />
        </g>
      ))}
      {stars(size).map(([x, y]) => (
        <circle key={`star-${x}-${y}`} cx={x} cy={y} r={0.09} fill="var(--color-ink)" opacity="0.8" />
      ))}
      {Array.from({ length: size }, (_, i) => (
        <g key={`lab-${i}`} fill="var(--color-ink-soft)" fontSize="0.34" fontFamily="var(--font-sans)" textAnchor="middle">
          <text x={i} y={-0.48}>{coordLabel(i, size - 1, size)[0]}</text>
          <text x={i} y={size - 1 + 0.68}>{coordLabel(i, size - 1, size)[0]}</text>
          <text x={-0.62} y={i + 0.12} textAnchor="end">{size - i}</text>
          <text x={size - 1 + 0.62} y={i + 0.12} textAnchor="start">{size - i}</text>
        </g>
      ))}
      {showTerritory && ownership
        ? ownership.map((value, index) => {
            if (Math.abs(value) < 0.18) return null;
            const x = index % size;
            const y = Math.floor(index / size);
            const black = value > 0;
            return (
              <rect
                key={`own-${index}`}
                x={x - 0.46}
                y={y - 0.46}
                width={0.92}
                height={0.92}
                rx={0.12}
                fill={black ? "var(--color-ink)" : "var(--color-paper)"}
                opacity={Math.min(0.45, Math.abs(value) * 0.5)}
              />
            );
          })
        : null}
      {node.board.map((row, y) =>
        row.map((value, x) => {
          if (!value) return null;
          const origin = node.origins[y]?.[x] ?? -1;
          const gradeId = origin > 0 ? gradeIds[origin] : null;
          const current = origin === cursor && cursor > 0;
          return (
            <g key={`stone-${x}-${y}`} filter="url(#honbo-shadow)">
              <circle
                cx={x}
                cy={y}
                r={0.46}
                fill={value === 1 ? "url(#honbo-black)" : "url(#honbo-white)"}
                stroke={value === 2 ? "var(--color-line)" : "transparent"}
                strokeWidth="0.03"
              />
              {showMarks && gradeId ? (
                <circle
                  cx={x}
                  cy={y}
                  r={current ? 0.52 : 0.48}
                  fill="none"
                  stroke={GRADE_COLOR[gradeId]}
                  strokeWidth={current ? 0.07 : 0.045}
                />
              ) : null}
              {current ? (
                <circle cx={x} cy={y} r={0.12} fill={value === 1 ? "var(--color-paper)" : "var(--color-ink)"} />
              ) : null}
            </g>
          );
        }),
      )}
      {ghosts.map((ghost, index) => (
        <g key={`ghost-${ghost.x}-${ghost.y}-${index}`} opacity="0.55">
          <circle
            cx={ghost.x}
            cy={ghost.y}
            r={0.42}
            fill={ghost.player === "B" ? "var(--color-ink)" : "var(--color-paper)"}
            stroke="var(--color-pine)"
            strokeWidth="0.04"
          />
          <text
            x={ghost.x}
            y={ghost.y + 0.13}
            textAnchor="middle"
            fontSize="0.34"
            fontFamily="var(--font-sans)"
            fill={ghost.player === "B" ? "var(--color-paper)" : "var(--color-ink)"}
          >
            {index + 1}
          </text>
        </g>
      ))}
      {suggestions.map((suggestion) => {
        if (suggestion.pass) return null;
        if (ghosts.some((ghost) => ghost.x === suggestion.x && ghost.y === suggestion.y)) return null;
        const active = suggestion.id === activeSuggestion;
        const color = GRADE_COLOR[gradeFor(suggestion.pointsLost).id];
        return (
          <g key={`sug-${suggestion.id}`}>
            <circle cx={suggestion.x} cy={suggestion.y} r={active ? 0.38 : 0.3} fill={color} opacity={active ? 0.95 : 0.82} />
            <text
              x={suggestion.x}
              y={suggestion.y + 0.12}
              textAnchor="middle"
              fontSize="0.34"
              fontFamily="var(--font-sans)"
              fill="var(--color-paper)"
            >
            {String.fromCharCode(65 + suggestion.id)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: size }, (_, y) =>
        Array.from({ length: size }, (_, x) => (
          <rect
            key={`hit-${x}-${y}`}
            x={x - 0.5}
            y={y - 0.5}
            width={1}
            height={1}
            fill="transparent"
            onMouseEnter={() => {
              setHover({ x, y });
              const hit = suggestions.find((suggestion) => !suggestion.pass && suggestion.x === x && suggestion.y === y);
              onHoverSuggestion(hit ? hit.id : null);
            }}
            onClick={() => {
              const origin = node.origins[y]?.[x] ?? -1;
              if (origin > 0) {
                onJump(origin);
              } else if (!node.board[y]?.[x] && onPlayPoint) {
                onPlayPoint(x, y);
              }
            }}
          />
        )),
      )}
      </svg>
    </div>
  );
}
