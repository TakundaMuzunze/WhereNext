import { getRecommendations } from "@/features/destination-matching";
import { parsePlannerAnswers, type PlannerSearchParams } from "@/features/trip-planner";
import { ResultsList } from "@/widgets/results-list";
import { ResultsSummary } from "@/widgets/results-summary";
import Link from "next/link";

type ResultsPageProps = {
  searchParams: Promise<PlannerSearchParams>;
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const answers = parsePlannerAnswers(await searchParams);

  if (!answers) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-24">
        <section className="w-full rounded-3xl border border-primary/20 bg-background p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-text">We need your trip details first</h1>
          <p className="mt-3 text-text/70">Complete the planner so we can build a destination shortlist around your answers.</p>
          <Link href="/planner" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-white dark:text-[#101214]">
            Start planning
          </Link>
        </section>
      </main>
    );
  }

  const recommendations = getRecommendations(answers);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-24">
      <header className="mb-8">
        <p className="text-sm tracking-widest text-accent uppercase">Your focused shortlist</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text">Three places that fit your trip.</h1>
        <p className="mt-3 max-w-2xl text-text/70">Ranked around your budget, dates and travel style, with a clear reason behind every match.</p>
      </header>

      <div className="grid gap-8">
        <ResultsSummary answers={answers} />
        <ResultsList recommendations={recommendations} answers={answers} />
      </div>
    </main>
  );
}
