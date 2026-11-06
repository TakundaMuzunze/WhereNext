import type { ImportedDestination } from "@/entities/destination/model/importedDestination";
import { DestinationPhoto } from "@/entities/destination/ui/DestinationPhoto";
import { DestinationActivityEvidence } from "@/features/destination-activities/ui/DestinationActivityEvidence";
import type { DiscoveryRequest } from "@/features/destination-planning/model/discoveryRequest";
import { DiscoveryRequestSummary } from "@/features/destination-planning/ui/DiscoveryRequestSummary";
import { assessSeason, type SeasonalGuidance } from "@/features/destination-seasons/lib/assessSeason";
import { SeasonalEvidence } from "@/features/destination-seasons/ui/SeasonalGuidance";
import { SaveDestinationButton } from "@/features/saved-destinations";
import Link from "next/link";

type ImportedDestinationDetailsProps = {
  destination: ImportedDestination;
  backHref?: string;
  editHref?: string;
  activities?: string[];
  discoveryRequest?: DiscoveryRequest;
  seasonalGuidance?: SeasonalGuidance;
};

export function ImportedDestinationDetails({
  destination,
  backHref = "/saved",
  editHref,
  activities,
  discoveryRequest,
  seasonalGuidance,
}: ImportedDestinationDetailsProps) {
  const importedDate = new Date(destination.importedAt).toLocaleDateString("en-GB", { timeZone: "UTC" });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 pt-28 pb-20">
      <Link href={backHref} className="cursor-pointer text-sm text-primary">
        ← Back to {backHref.startsWith("/results") ? "your trip" : "saved destinations"}
      </Link>

      {discoveryRequest && (
        <div className="mt-5">
          <DiscoveryRequestSummary request={discoveryRequest} />
        </div>
      )}

      <section className="mt-6 overflow-hidden rounded-3xl border border-border bg-surface">
        <DestinationPhoto name={destination.name} image={destination.image} variant="hero" />
        <div className="p-6 sm:p-8">
          <p className="text-sm text-muted">{destination.country}</p>
          <h1 className="mt-3 text-5xl font-semibold">{destination.name}</h1>
          <p className="mt-5 max-w-2xl leading-7 text-muted">
            Keep this place as a travel idea while you explore whether it suits your trip. You can save it before choosing dates or checking prices.
          </p>
          <div className="mt-6">
            <SaveDestinationButton destinationId={destination.id} />
          </div>
          {editHref && (
            <Link href={editHref} className="mt-5 inline-block cursor-pointer text-sm text-primary">
              Edit your trip
            </Link>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-border p-8" aria-labelledby="destination-evidence-title">
        <h2 id="destination-evidence-title" className="text-2xl font-semibold">
          What we know so far
        </h2>
        <DestinationActivityEvidence key={destination.id + JSON.stringify(activities)} destinationId={destination.id} activities={activities} />
        <SeasonalEvidence guidance={seasonalGuidance ?? assessSeason(null, discoveryRequest?.timing ?? { kind: "flexible" }, activities ?? [])} />
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          {[["Budget fit", "Unknown - a complete trip estimate is not available."]].map(([label, explanation]) => (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-2 text-sm leading-6 text-muted">{explanation}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8 rounded-3xl border border-border p-8" aria-labelledby="destination-source-title">
        <h2 id="destination-source-title" className="text-2xl font-semibold">
          Place information and sources
        </h2>
        <p className="mt-4 text-sm leading-6 text-muted">
          Location: {destination.latitude}, {destination.longitude}. Imported on {importedDate}. This is recorded place information; it does not
          establish current prices, availability or suitability.
        </p>
        <div className="mt-4 flex flex-wrap gap-5 text-sm text-primary">
          <a className="cursor-pointer" href={destination.sourceUrl} target="_blank" rel="noreferrer">
            Read the Wikivoyage guide
          </a>
          <a
            className="cursor-pointer"
            href={`https://en.wikivoyage.org/w/index.php?oldid=${destination.sourceRevisionId}`}
            target="_blank"
            rel="noreferrer"
          >
            Source revision and contributors
          </a>
          <a className="cursor-pointer" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            CC BY-SA 4.0
          </a>
        </div>
      </section>
    </main>
  );
}
