export const GRADES = [
  {
    id: "excellent",
    label: "Excelente",
    plural: "Excelentes",
    max: 1,
    hint: "menos de 1 ponto",
  },
  {
    id: "good",
    label: "Bom",
    plural: "Bons",
    max: 2.5,
    hint: "de 1 a 2,5 pontos",
  },
  {
    id: "inaccuracy",
    label: "Imprecisão",
    plural: "Imprecisões",
    max: 5,
    hint: "de 2,5 a 5 pontos",
  },
  {
    id: "mistake",
    label: "Erro",
    plural: "Erros",
    max: 10,
    hint: "de 5 a 10 pontos",
  },
  {
    id: "blunder",
    label: "Erro grosseiro",
    plural: "Erros grosseiros",
    max: Number.POSITIVE_INFINITY,
    hint: "10 pontos ou mais",
  },
] as const;

export type GradeId = (typeof GRADES)[number]["id"];

export type Grade = (typeof GRADES)[number];

export function gradeFor(pointsLost: number): Grade {
  for (const grade of GRADES) {
    if (pointsLost < grade.max) return grade;
  }
  return GRADES[GRADES.length - 1]!;
}

/** Points the mover gave away, from Black's score lead before and after the move. */
export function pointsLostForMove(prevLead: number, nextLead: number, player: "B" | "W"): number {
  const loss = player === "B" ? prevLead - nextLead : nextLead - prevLead;
  if (!Number.isFinite(loss)) return 0;
  return Math.max(0, loss);
}

/** 100 keeps every point; each lost point multiplies the move by 0.82. */
export function accuracyFromLosses(losses: number[]): number | null {
  if (!losses.length) return null;
  const sum = losses.reduce((acc, loss) => acc + 0.82 ** loss, 0);
  return Math.round((100 * sum) / losses.length);
}
