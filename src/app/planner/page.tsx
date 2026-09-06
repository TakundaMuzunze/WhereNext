import { parsePlannerAnswers, type PlannerSearchParams, TripPlannerForm } from "@/features/trip-planner";

type PlannerPageProps = {
  searchParams: Promise<PlannerSearchParams>;
};

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const initialAnswers = parsePlannerAnswers(await searchParams) ?? undefined;

  return (
    <main>
      <TripPlannerForm initialAnswers={initialAnswers} />
    </main>
  );
}
