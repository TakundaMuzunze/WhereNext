import type { DestinationScoreBreakdown } from "@/entities/destination";
import { scoreWeights } from "../lib/scoreDestination";

type MatchBreakdownProps = {
  breakdown: DestinationScoreBreakdown;
  initiallyOpen?: boolean;
};

const categories: { key: keyof DestinationScoreBreakdown; label: string }[] = [
  { key: "budget", label: "Budget" },
  { key: "travelMonth", label: "Travel month" },
  { key: "tripType", label: "Trip type" },
  { key: "activities", label: "Activities" },
  { key: "duration", label: "Duration" },
];

export function MatchBreakdown({ breakdown, initiallyOpen = false }: MatchBreakdownProps) {
  return (
    <details className="group border-t border-primary/15" open={initiallyOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-medium text-accent [&::-webkit-details-marker]:hidden">
        Why this match?
        <span aria-hidden="true" className="text-xl leading-none group-open:hidden">
          +
        </span>
        <span aria-hidden="true" className="hidden text-xl leading-none group-open:inline">
          −
        </span>
      </summary>
      <div className="px-6 pb-6">
        <p className="mb-5 text-sm text-text/70">
          A weighted guide based on your answers, not a guarantee. Each category shows points earned out of the available points.
        </p>
        <dl className="grid gap-3">
          {categories.map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_3rem]">
              <dt className="text-text/85">{label}</dt>
              <dd className="h-2 overflow-hidden rounded-full bg-primary/15">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(breakdown[key] / scoreWeights[key]) * 100}%` }} />
              </dd>
              <dd className="text-right font-mono text-xs text-text/70">
                {breakdown[key]}/{scoreWeights[key]}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
