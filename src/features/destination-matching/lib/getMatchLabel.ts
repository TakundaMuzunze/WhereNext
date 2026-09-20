type MatchLabel = {
  minimumScore: number;
  label: string;
};

const matchStrengths: MatchLabel[] = [
  {
    minimumScore: 90,
    label: "Excellent alternative",
  },
  {
    minimumScore: 75,
    label: "Strong alternative",
  },
  {
    minimumScore: 60,
    label: "Good alternative",
  },
] as const;

export function getMatchLabel(score: number, rank: number): string {
  if (rank === 1) return score >= 60 ? "Best match" : "Closest match";

  const strength = matchStrengths.find(({ minimumScore }) => score >= minimumScore);

  return strength?.label ?? "Possible alternative";
}
