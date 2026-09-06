import { getMatchLabel, getRecommendations } from "@/features/destination-matching";
import { parsePlannerAnswers, serializePlannerAnswers, type PlannerSearchParams } from "@/features/trip-planner";
import { destinations } from "@/shared/data/destinations";
import { DestinationDetails } from "@/widgets/destination-details";
import Link from "next/link";
import { notFound } from "next/navigation";

type DestinationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<PlannerSearchParams>;
};

export function generateStaticParams() {
  return destinations.map((destination) => ({ id: destination.id }));
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { id } = await params;
  const destination = destinations.find((item) => item.id === id);

  if (!destination) notFound();

  const answers = parsePlannerAnswers(await searchParams);

  if (!answers) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-24">
        <section className="w-full rounded-3xl border border-primary/20 bg-background p-8 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-text">Plan your trip to see this match</h1>
          <p className="mt-3 text-text/70">Your details are used to calculate the score, cost fit, and personalised reasons on this page.</p>
          <Link href="/planner" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 text-white dark:text-[#101214]">
            Start planning
          </Link>
        </section>
      </main>
    );
  }

  const recommendations = getRecommendations(answers, destinations.length);
  const recommendationIndex = recommendations.findIndex((item) => item.destination.id === id);
  const recommendation = recommendations[recommendationIndex];

  if (!recommendation) notFound();

  const query = serializePlannerAnswers(answers);
  const rank = recommendationIndex + 1;

  return (
    <DestinationDetails
      recommendation={recommendation}
      answers={answers}
      matchLabel={getMatchLabel(recommendation.score, rank)}
      backHref={`/results?${query}`}
      editHref={`/planner?${query}`}
    />
  );
}
