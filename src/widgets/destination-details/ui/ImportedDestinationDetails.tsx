import type { ImportedDestination } from "@/entities/destination/model/importedDestination";
import { SaveDestinationButton } from "@/features/saved-destinations";
import Link from "next/link";

type ImportedDestinationDetailsProps = {
  destination: ImportedDestination;
  backHref?: string;
  editHref?: string;
};

export function ImportedDestinationDetails({ destination, backHref = "/saved", editHref }: ImportedDestinationDetailsProps) {
  const importedDate = new Date(destination.importedAt).toLocaleDateString("en-GB", { timeZone: "UTC" });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 pt-28 pb-20">
      <Link href={backHref} className="text-sm text-primary">
        ← Back to {backHref.startsWith("/results") ? "your trip" : "saved destinations"}
      </Link>

      <section className="mt-6 rounded-3xl border border-border bg-surface p-8">
        <p className="text-sm text-muted">{destination.country}</p>
        <h1 className="mt-3 text-5xl font-semibold">{destination.name}</h1>
        <p className="mt-5 max-w-2xl leading-7 text-muted">
          Keep this place as a travel idea while you explore whether it suits your trip. You can save it before choosing dates or checking prices.
        </p>
        <div className="mt-6">
          <SaveDestinationButton destinationId={destination.id} />
        </div>
        {editHref && (
          <Link href={editHref} className="mt-5 inline-block text-sm text-primary">
            Edit your trip
          </Link>
        )}
      </section>

      <section className="mt-8 rounded-3xl border border-border p-8" aria-labelledby="destination-evidence-title">
        <h2 id="destination-evidence-title" className="text-2xl font-semibold">
          What we know so far
        </h2>
        <dl className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            ["Activity fit", "Unknown — activity evidence is not available yet."],
            ["Seasonal suitability", "Unknown — we have not assessed conditions for your intended experiences."],
            ["Budget fit", "Unknown — a complete trip estimate is not available."],
          ].map(([label, explanation]) => (
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
          <a href={destination.sourceUrl} target="_blank" rel="noreferrer">
            Read the Wikivoyage guide
          </a>
          <a href={`https://en.wikivoyage.org/w/index.php?oldid=${destination.sourceRevisionId}`} target="_blank" rel="noreferrer">
            Source revision and contributors
          </a>
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            CC BY-SA 4.0
          </a>
        </div>
      </section>
    </main>
  );
}
