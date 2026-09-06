import type { DestinationRecommendation } from "@/entities/destination";
import { ArrowRight, CircleCheck } from "lucide-react";
import Link from "next/link";

type DestinationCardProps = {
  recommendation: DestinationRecommendation;
  rank: number;
  matchLabel: string;
  detailsHref: string;
};

type CardProps = DestinationCardProps & {
  description?: string;
};

export function DestinationCard({ recommendation, rank, matchLabel, detailsHref, description = recommendation.destination.description }: CardProps) {
  const isBestMatch = rank === 1;

  return (
    <article
      className={`grid gap-6 rounded-3xl border p-6 md:grid-cols-[7rem_1fr] ${
        isBestMatch ? "border-accent/50 bg-secondary/20 shadow-md" : "border-primary/20 bg-background shadow-sm"
      }`}
    >
      <div className="flex items-center justify-center rounded-2xl bg-primary p-3 text-white md:p-5 dark:text-[#101214]">
        <div className="text-center">
          <span className="block text-2xl font-medium">{recommendation.score}%</span>
          <span className="text-xs tracking-widest uppercase">Match</span>
        </div>
      </div>

      <div className="flex flex-col items-start justify-center gap-4 text-text">
        <div className="flex w-full flex-row items-center justify-between">
          <p className="tracking-widest text-accent uppercase">{matchLabel}</p>
          <div className="flex flex-col gap-1 text-right">
            <p className="text-sm text-text/60">
              <span className="text-base font-medium text-text">£{recommendation.destination.estimatedCostPerPerson.toLocaleString()}</span>
            </p>
            <p className="text-sm text-text/75">estimated per person</p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold">
          {recommendation.destination.name}
          <span className="text-xl font-normal text-text/60"> • {recommendation.destination.country}</span>
        </h2>

        <p className="text-text/75">{description}</p>

        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {recommendation.reasons.map((reason) => (
            <li key={reason} className="flex items-center gap-2 text-sm text-accent">
              <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-row flex-wrap items-start justify-start gap-2">
          {recommendation.destination.activities.map((activity) => (
            <span key={activity} className="rounded-full bg-secondary/20 px-3 py-1.5 text-sm text-text/75">
              {activity}
            </span>
          ))}
        </div>

        <Link
          href={detailsHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:text-[#101214]"
        >
          View destination
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
