import { DiscoveryPlanner } from "@/features/destination-planning/ui/DiscoveryPlanner";
import { parseDiscoveryRequest } from "@/features/destination-planning/lib/discoveryRequest";
import { parseDatedTripDraft } from "@/features/trip-planner/lib/datedTripDraft";
import { DatedTripForm } from "@/features/trip-planner/ui/DatedTripForm";
import { parseDatedTripRequest } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { parsePlannerAnswers, type PlannerSearchParams, TripPlannerForm } from "@/features/trip-planner";

type PlannerPageProps = {
  searchParams: Promise<PlannerSearchParams>;
};

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const query = await searchParams;
  const hasLegacyContext = query.departure !== undefined || query.mode === "legacy";

  if (query.kind === "discovery" || (query.kind === undefined && !hasLegacyContext)) {
    const request = parseDiscoveryRequest(query);
    const isNewRequest = Object.keys(query).every((key) => ["kind", "resumeSave"].includes(key));

    return <DiscoveryPlanner key={JSON.stringify(query)} initialRequest={request ?? undefined} invalidLink={!request && !isNewRequest} />;
  }

  if (query.kind !== undefined) {
    const request = parseDatedTripRequest(query);
    const draft = parseDatedTripDraft(query);
    const isNew = query.kind === "dated" && Object.keys(query).every((key) => ["kind", "resumeSave"].includes(key));
    return (
      <main>
        <DatedTripForm
          key={JSON.stringify(query)}
          initialRequest={request ?? undefined}
          initialDraft={draft ?? undefined}
          invalidLink={!request && !draft && !isNew}
        />
      </main>
    );
  }
  const initialAnswers = parsePlannerAnswers(query) ?? undefined;

  return (
    <main>
      <TripPlannerForm initialAnswers={initialAnswers} />
    </main>
  );
}
