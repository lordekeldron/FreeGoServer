export const GRADES = [
  {
    id: "excellent",
    label: "Excelente",
    labelEn: "Excellent",
    plural: "Excelentes",
    pluralEn: "Excellent",
    color: "#2563eb",
    dotClass: "bg-blue-600",
    textClass: "text-blue-600",
    max: 0.35,
    hint: "menos de 0,35 ponto",
    hintEn: "under 0.35 pts",
  },
  {
    id: "great",
    label: "Ótimo",
    labelEn: "Great",
    plural: "Ótimos",
    pluralEn: "Great",
    color: "#16a34a",
    dotClass: "bg-green-600",
    textClass: "text-green-600",
    max: 1.0,
    hint: "de 0,35 a 1 ponto",
    hintEn: "0.35 to 1.0 pts",
  },
  {
    id: "good",
    label: "Bom",
    labelEn: "Good",
    plural: "Bons",
    pluralEn: "Good",
    color: "#65a30d",
    dotClass: "bg-lime-600",
    textClass: "text-lime-600",
    max: 2.2,
    hint: "de 1 a 2,2 pontos",
    hintEn: "1.0 to 2.2 pts",
  },
  {
    id: "inaccuracy",
    label: "Imprecisão",
    labelEn: "Inaccuracy",
    plural: "Imprecisões",
    pluralEn: "Inaccuracies",
    color: "#d97706",
    dotClass: "bg-amber-600",
    textClass: "text-amber-600",
    max: 4.5,
    hint: "de 2,2 a 4,5 pontos",
    hintEn: "2.2 to 4.5 pts",
  },
  {
    id: "mistake",
    label: "Erro",
    labelEn: "Mistake",
    plural: "Erros",
    pluralEn: "Mistakes",
    color: "#ea580c",
    dotClass: "bg-orange-600",
    textClass: "text-orange-600",
    max: 8.5,
    hint: "de 4,5 a 8,5 pontos",
    hintEn: "4.5 to 8.5 pts",
  },
  {
    id: "blunder",
    label: "Erro grosseiro",
    labelEn: "Blunder",
    plural: "Erros grosseiros",
    pluralEn: "Blunders",
    color: "#dc2626",
    dotClass: "bg-red-600",
    textClass: "text-red-600",
    max: Number.POSITIVE_INFINITY,
    hint: "8,5 pontos ou mais",
    hintEn: "8.5+ pts",
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
