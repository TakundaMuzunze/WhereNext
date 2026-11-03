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

  return (
    <article aria-label={`${destination.name}, ${destination.country}`} className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <p className="text-sm text-muted">{destination.country}</p>
      <h2 className="mt-2 font-serif text-3xl">{destination.name}</h2>
      <ul className="mt-5 space-y-4">
        {destination.assessments.map((assessment) => (
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
            {assessment.reason === "unsupported_interest" && (
              <p className="mt-1 text-sm text-muted">We do not yet have verified evidence for this interest.</p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm text-muted">Budget fit: unknown</p>
      <p className="mt-2 text-sm text-muted">Seasonal suitability: unknown</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link href={detailsHref} className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">
          Explore {destination.name}
        </Link>
        <SaveDestinationButton destinationId={destination.id} />
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
      <p className="mt-6 max-w-3xl text-sm leading-6 text-muted">
        Ordered by supported interests, then fewer explicit conflicts. Evidence ties use destination name. Unknowns remain unknown. Missing prices
        never exclude a place; your budget does not yet establish affordability.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        Current imported catalogue coverage is limited. These results use stored evidence; browsing does not trigger live checks. Open a destination
        to check nearby activities. No flight search has been made.
      </p>
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
      <div className="mt-8 grid gap-5 md:grid-cols-2">
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
