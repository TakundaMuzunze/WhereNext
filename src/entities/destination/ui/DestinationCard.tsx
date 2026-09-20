import type { DestinationRecommendation } from "@/entities/destination";
import { SaveDestinationButton } from "@/features/saved-destinations";
import { ArrowRight, CircleCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type DestinationCardProps = {
  recommendation: DestinationRecommendation;
  rank: number;
  matchLabel: string;
  detailsHref: string;
  explanation?: ReactNode;
};

type CardProps = DestinationCardProps & {
  description?: string;
};

export function DestinationCard({
  recommendation,
  rank,
  matchLabel,
  detailsHref,
  explanation,
  description = recommendation.destination.description,
}: CardProps) {
  const isBestMatch = rank === 1 && recommendation.score >= 60;

  return (
    <article
      className={`overflow-hidden rounded-3xl border ${
        isBestMatch ? "border-accent/50 bg-secondary/20 shadow-md" : "border-primary/20 bg-background shadow-sm"
      }`}
    >
      <div className="grid md:grid-cols-[12rem_minmax(0,1fr)]">
        <div className="relative min-h-44 overflow-hidden bg-secondary/20 md:min-h-full">
          <Image
            src={recommendation.destination.image.src}
            alt={recommendation.destination.image.alt}
            fill
            sizes="(max-width: 768px) 100vw, 192px"
            className="object-cover"
          />
        </div>
        <div className="flex flex-col items-start gap-4 p-6 text-text">
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="rounded-full bg-secondary/20 px-3 py-1.5 text-sm font-medium text-accent">{matchLabel}</p>
            <p className="text-sm font-medium text-accent">{recommendation.score}% match</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{recommendation.destination.name}</h2>
            <p className="text-sm text-text/60">{recommendation.destination.country}</p>
          </div>
          <p className="text-sm leading-relaxed text-text/75">{description}</p>
          {recommendation.reasons.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {recommendation.reasons.map((reason) => (
                <li key={reason} className="flex items-center gap-2 text-sm text-accent">
                  <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <p className="text-sm text-text/70">
              <span className="text-lg font-medium text-text">£{recommendation.destination.estimatedCostPerPerson.toLocaleString()}</span> estimated
              per person
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={detailsHref}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:text-[#101214]"
              >
                View destination <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <SaveDestinationButton destinationId={recommendation.destination.id} />
            </div>
          </div>
        </div>
      </div>
      {explanation}
    </article>
  );
}
