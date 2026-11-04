import { DestinationPhoto } from "@/entities/destination/ui/DestinationPhoto";
import Link from "next/link";
import { SaveDestinationButton } from "@/features/saved-destinations";
import type { DiscoveryRequest } from "../model/discoveryRequest";
import { serializeDiscoveryRequest } from "../lib/discoveryRequest";
import type { DiscoveryCandidate } from "../lib/rankDestinations";
import { DiscoveryRequestSummary } from "./DiscoveryRequestSummary";
import { getDiscoveryResults } from "../server/getDiscoveryResults";

const statusLabels = {
  supported: "evidence found nearby",
  contradicted: "conflicting evidence",
  unknown: "unknown",
};

function DestinationResult({ destination, query }: { destination: DiscoveryCandidate; query: string }) {
  const detailsHref = `/destinations/${encodeURIComponent(destination.id)}?${query}`;

  const unverified = destination.assessments.filter(
    (assessment) =>
      assessment.status === "unknown" &&
      ["unsupported_interest", "unavailable", "location_unknown"].includes(assessment.reason) &&
      assessment.places.length === 0 &&
      !assessment.observation,
  );
  const evidence = destination.assessments.filter((assessment) => !unverified.includes(assessment));

  return (
    <article
      aria-label={`${destination.name}, ${destination.country}`}
      className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="aspect-video overflow-hidden">
        <DestinationPhoto name={destination.name} image={destination.guideImage ?? destination.image} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm text-muted">{destination.country}</p>
        <h2 className="mt-2 font-serif text-3xl">{destination.name}</h2>
        <ul className="mt-4 space-y-3">
          {evidence.map((assessment) => (
            <li key={assessment.activity}>
              <p className="font-medium">
                {assessment.activity}: {statusLabels[assessment.status]}
              </p>
              {assessment.places.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {assessment.places.slice(0, 2).map((place) => (
                    <li key={place.sourceId}>
                      <a href={place.sourceUrl} target="_blank" rel="noreferrer" className="cursor-pointer text-primary underline">
                        {place.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {assessment.observation && (
                <p className="mt-2 text-xs leading-5 text-muted">
                  Nearby sample within 4 km, retrieved {formatEvidenceDate(assessment.observation.retrievedAt)}. Opening on your dates is unverified.
                </p>
              )}
              {assessment.reason === "stale_evidence" && (
                <p className="mt-1 text-sm text-muted">Earlier evidence has expired; examples do not establish a current match.</p>
              )}
              {assessment.reason === "incomplete_evidence" && (
                <p className="mt-1 text-sm text-muted">Evidence is incomplete; examples do not establish a confirmed match.</p>
              )}
              {["unsupported_interest", "unavailable", "location_unknown"].includes(assessment.reason) && (
                <p className="mt-1 text-sm text-muted">We do not yet have verified evidence for this interest.</p>
              )}
            </li>
          ))}
        </ul>
        {unverified.length > 0 && (
          <div className="mt-4 rounded-xl bg-secondary/60 p-3 text-sm">
            <h3 className="font-medium">Still to verify</h3>
            <p className="mt-1 leading-6">{unverified.map((assessment) => assessment.activity).join(" · ")}</p>
            <p className="mt-1 text-xs leading-5 text-muted">We don’t yet have verified information for these interests.</p>
          </div>
        )}
        <p className="mt-4 text-xs leading-5 text-muted">Budget fit and seasonal suitability: unknown</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
          <Link
            href={detailsHref}
            className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Explore {destination.name}
          </Link>
          <SaveDestinationButton destinationId={destination.id} iconOnly />
        </div>
      </div>
    </article>
  );
}

function formatEvidenceDate(date: string): string {
  return new Date(date).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

export async function DiscoveryResults({ request, pageNumber = 1 }: { request: DiscoveryRequest; pageNumber?: number }) {
  const query = serializeDiscoveryRequest(request);
  let result;

  try {
    result = await getDiscoveryResults(request);
  } catch {
    return (
      <main className="mx-auto min-h-screen max-w-5xl px-6 pt-28 pb-20 text-text">
        <h1 className="font-serif text-4xl">Destinations are temporarily unavailable</h1>
        <div className="mt-6">
          <DiscoveryRequestSummary request={request} />
        </div>
        <p role="alert" className="mt-6">
          We could not load the destination catalogue. Your request is preserved.
        </p>
        <Link href={`/results?${query}`} className="mt-6 inline-flex min-h-11 cursor-pointer items-center text-primary underline">
          Try again
        </Link>
      </main>
    );
  }

  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(result.candidates.length / pageSize));
  const currentPage = Math.min(Math.max(1, pageNumber), totalPages);
  const firstIndex = (currentPage - 1) * pageSize;
  const visibleCandidates = result.candidates.slice(firstIndex, firstIndex + pageSize);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pt-28 pb-20 text-text">
      <h1 className="font-serif text-4xl">Places to explore</h1>
      <div className="mt-6">
        <DiscoveryRequestSummary request={request} />
      </div>
      <div className="mt-5 text-sm text-muted">
        <p>Based on your selected interests. Prices haven&apos;t been checked.</p>
        <details className="mt-1">
          <summary className="min-h-11 cursor-pointer py-3 text-primary">How these results work</summary>
          <div className="max-w-3xl space-y-2 pb-2 leading-6">
            <p>
              Ordered by supported interests, then fewer explicit conflicts. Evidence ties use destination name. Unknowns remain unknown. Missing
              prices never exclude a place; your budget does not yet establish affordability.
            </p>
            <p>
              Current imported catalogue coverage is limited. These results use stored evidence; browsing does not trigger live checks. Open a
              destination to check nearby activities. No flight search has been made.
            </p>
          </div>
        </details>
      </div>
      {result.evidenceUnavailable && (
        <p role="status" className="mt-4">
          Activity evidence is temporarily unavailable. Destinations remain available with unknown interests.
        </p>
      )}
      {result.candidates.length === 0 && (
        <p role="status" className="mt-8">
          No destinations have been imported yet. Your request is ready; try again once catalogue coverage is available.
        </p>
      )}
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {visibleCandidates.map((destination) => (
          <DestinationResult key={destination.id} destination={destination} query={query} />
        ))}
      </div>
      {totalPages > 1 && (
        <nav aria-label="Result pages" className="mt-8 flex flex-wrap items-center gap-5">
          {currentPage > 1 && (
            <Link
              href={`/results?${query}&page=${currentPage - 1}`}
              className="inline-flex min-h-11 cursor-pointer items-center text-primary underline"
            >
              Previous destinations
            </Link>
          )}
          <p className="text-sm">
            Page {currentPage} of {totalPages}
          </p>
          {currentPage < totalPages && (
            <Link
              href={`/results?${query}&page=${currentPage + 1}`}
              className="inline-flex min-h-11 cursor-pointer items-center text-primary underline"
            >
              More destinations
            </Link>
          )}
        </nav>
      )}
      <p className="mt-8 text-xs text-muted">
        Activity data:{" "}
        <a href="https://www.geoapify.com/" className="cursor-pointer underline">
          Geoapify
        </a>{" "}
        /{" "}
        <a href="https://www.openstreetmap.org/copyright" className="cursor-pointer underline">
          OpenStreetMap contributors
        </a>
        . Listings are a bounded sample, not a quality score or complete inventory.
      </p>
    </main>
  );
}
