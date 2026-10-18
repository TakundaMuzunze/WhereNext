import { DatedTripReview } from "@/features/trip-planner/ui/DatedTripReview";
import { parseDatedTripRequest, serializeDatedTripRequest } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { destinations } from "@/shared/data/destinations";
import { getRecommendations } from "@/features/destination-matching";
import { parsePlannerAnswers, type PlannerSearchParams } from "@/features/trip-planner";
import { ResultsList } from "@/widgets/results-list";
import { ResultsSummary } from "@/widgets/results-summary";
import Link from "next/link";

type ResultsPageProps = {
  searchParams: Promise<PlannerSearchParams>;
};

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const query = await searchParams;
  if (query.kind !== undefined) {
    const request = parseDatedTripRequest(query);
    if (!request)
      return (
        <main className="mx-auto min-h-screen max-w-4xl px-6 py-28 text-text">
          <h1 className="text-3xl">Invalid dated request</h1>
          <p className="mt-4">Check your dates and trip details before continuing.</p>
          <Link className="mt-6 inline-flex min-h-11 items-center underline" href="/planner?kind=dated">
            Start a dated request
          </Link>
        </main>
      );
    const requestQuery = serializeDatedTripRequest(request);
    return (
      <main className="mx-auto min-h-screen max-w-4xl space-y-8 px-6 py-28 text-text">
        <h1 className="text-3xl font-semibold">Review your dated holiday</h1>
        <DatedTripReview request={request} />
        <section aria-label="Destination guides">
          <h2 className="text-2xl">Explore destination guides</h2>
          <p className="mt-3">
            Browse our existing guides while you plan. These places have not been checked for your airport, dates, budget or preferences.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {destinations
              .filter(({ country }) => ["France", "Spain", "Portugal", "Italy", "Greece", "Malta"].includes(country))
              .map((destination) => (
                <li key={destination.id}>
                  <Link className="inline-flex min-h-11 items-center underline" href={`/destinations/${destination.id}?${requestQuery}`}>
                    {destination.name}, {destination.country}
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      </main>
    );
  }
  const answers = parsePlannerAnswers(query);

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
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text">Places worth considering.</h1>
        <p className="mt-3 max-w-2xl text-text/70">See how each destination fits your budget, travel month, trip style, activities and duration.</p>
      </header>

      <div className="grid gap-8">
        <ResultsSummary answers={answers} />
        <ResultsList recommendations={recommendations} answers={answers} />
      </div>
    </main>
  );
}
