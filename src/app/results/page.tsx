import { formatTripDate } from "@/features/trip-planner/ui/DatedTripSummary";
import { DatedTripReview } from "@/features/trip-planner/ui/DatedTripReview";
import { parseDatedTripRequest, serializeDatedTripRequest, tripNights } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { destinations } from "@/shared/data/destinations";
import { getRecommendations } from "@/features/destination-matching";
import { parsePlannerAnswers, type PlannerSearchParams } from "@/features/trip-planner";
import { ResultsList } from "@/widgets/results-list";
import { ResultsSummary } from "@/widgets/results-summary";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

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
    const nights = tripNights(request);
    const group = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"][request.adultCount];
    return (
      <main className="mx-auto min-h-screen max-w-5xl space-y-8 px-6 py-28 text-text">
        <header>
          <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">The next chapter</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight sm:text-5xl">
            {nights} {nights === 1 ? "night" : "nights"} away for {group}.
          </h1>
          <p className="mt-4 text-muted">
            {formatTripDate(request.outboundDate)} – {formatTripDate(request.returnDate)} · From {request.departureAirportCode}
          </p>
        </header>
        <DatedTripReview request={request} />
        <section aria-label="Destination guides">
          <h2 className="font-serif text-3xl tracking-tight">A little inspiration for what comes next</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Explore our destination guides for inspiration. These are not matched holidays: prices and availability have not been checked for your
            airport, dates, budget or preferences.
          </p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destinations
              .filter(({ country }) => ["France", "Spain", "Portugal", "Italy", "Greece", "Malta"].includes(country))
              .map((destination) => (
                <li key={destination.id}>
                  <Link
                    className="group block overflow-hidden rounded-2xl border border-border bg-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                    href={`/destinations/${destination.id}?${requestQuery}`}
                  >
                    <div className="relative aspect-[3/2] overflow-hidden bg-secondary">
                      <Image
                        src={destination.image.src}
                        alt={destination.image.alt}
                        fill
                        sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
                        className="object-cover transition-transform motion-safe:group-hover:scale-105"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-serif text-xl">{destination.name}</p>
                        <p className="mt-1 text-xs text-muted">{destination.country} · Destination guide</p>
                      </div>
                      <ArrowUpRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
                    </div>
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
        <section className="w-full rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-text">We need your trip details first</h1>
          <p className="mt-3 text-muted">Complete the planner so we can build a destination shortlist around your answers.</p>
          <Link href="/planner" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-primary-foreground">
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
        <p className="mt-3 max-w-2xl text-muted">See how each destination fits your budget, travel month, trip style, activities and duration.</p>
      </header>

      <div className="grid gap-8">
        <ResultsSummary answers={answers} />
        <ResultsList recommendations={recommendations} answers={answers} />
      </div>
    </main>
  );
}
