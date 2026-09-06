import type { PlannerAnswers } from "@/entities/trip/model/types";
import { serializePlannerAnswers } from "@/features/trip-planner";
import { Pencil } from "lucide-react";
import Link from "next/link";

type ResultsSummaryProps = {
  answers: PlannerAnswers;
};

export function ResultsSummary({ answers }: ResultsSummaryProps) {
  const editAnswersHref = `/planner?${serializePlannerAnswers(answers)}`;

  return (
    <section
      aria-label="Your trip details"
      className="flex flex-col gap-4 rounded-2xl bg-secondary/20 p-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-4 text-sm tracking-wide text-text">
        <span>{answers.departure}</span>
        <span className="text-text/75" aria-hidden="true">
          •
        </span>
        <span>{answers.travelMonth}</span>
        <span className="text-text/75" aria-hidden="true">
          •
        </span>
        <span>{answers.duration} days</span>
        <span className="text-text/75" aria-hidden="true">
          •
        </span>
        <span>{answers.travellers} travellers</span>
        <span className="text-text/75" aria-hidden="true">
          •
        </span>
        <span>£{Number(answers.budget).toLocaleString()} total</span>
      </div>

      <Link
        href={editAnswersHref}
        className="flex flex-row items-center justify-center gap-2 rounded-xl border border-primary/50 px-4 py-2 text-sm text-text"
      >
        <Pencil size={16} aria-hidden="true" />
        Edit answers
      </Link>
    </section>
  );
}
