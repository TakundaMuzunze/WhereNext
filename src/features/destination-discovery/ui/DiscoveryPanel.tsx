"use client";

import { useRef, useState } from "react";
import type { DatedTripRequest } from "@/entities/trip/model/datedTripRequestSchema";
import { discoveryResultSchema, type DiscoveryResult } from "../model/discovery";

const pounds = (pence: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);

export function DiscoveryPanel({ request }: { request: DatedTripRequest }) {
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);

  async function search() {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(120000),
      });
      const body: unknown = await response.json();
      const parsed = discoveryResultSchema.safeParse(body);
      setResult(parsed.success ? parsed.data : { status: "provider_failure" });
    } catch {
      setResult({ status: "provider_failure" });
    } finally {
      pending.current = false;
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="discovery-heading" className="space-y-5">
      <div>
        <p className="text-xs tracking-widest text-primary uppercase">Your destination search</p>
        <h2 id="discovery-heading" className="mt-3 font-serif text-3xl">
          Find somewhere that fits.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Search cached flight estimates for your exact dates, then look for evidence of your activities. We currently cover France, Spain, Portugal,
          Italy, Greece and Malta. We compare up to four of the cheapest destinations returned, checking up to two activities per place.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
          Fares are previously found prices, not live quotes. Group flights are estimated by multiplying a ticket price by your adult count.
          Accommodation, baggage and airport transfers are not priced; group seats and return airports need checking with the provider.
        </p>
      </div>
      <button
        type="button"
        disabled={loading}
        onClick={search}
        className="min-h-11 rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-60"
      >
        {loading ? "Finding destinations…" : result ? "Search again" : "Find destinations"}
      </button>
      <div role="status" aria-live="polite">
        {loading && <p>Checking flights and destination evidence. This can take a minute.</p>}
        {result?.status === "empty" && (
          <p>
            No eligible cached fares were found for these exact dates. This does not mean flights are unavailable. Try other dates or check a flight
            provider directly.
          </p>
        )}
        {result?.status === "unavailable" && <p>Destination search is not available right now. Please try again later.</p>}
        {result?.status === "provider_failure" && (
          <p>
            We couldn’t complete the search. A travel service may be unavailable or our request allowance may have been reached. Please try again
            later.
          </p>
        )}
        {result?.status === "invalid_request" && <p>Your trip details need updating. Edit your dated request and check the dates.</p>}
        {result?.status === "success" && (
          <p>
            {result.recommendations.length} destinations found. Ordered by room left for accommodation, activity evidence, then estimated flight cost.
            Holiday style and seasonal suitability have not been verified.
            {result.partial ? " Some destination information could not be resolved or the search was limited." : ""}
          </p>
        )}
      </div>
      {result?.status === "success" && (
        <ul className="grid gap-5 sm:grid-cols-2">
          {result.recommendations.map((option) => (
            <li key={option.id} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-serif text-2xl">{option.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {option.country} · Arrival airport {option.airport} · {option.stops === 0 ? "Direct outbound" : `${option.stops} outbound stops`}
              </p>
              <dl className="mt-5 space-y-3 text-sm">
                {[
                  ["Cached ticket price", `${pounds(option.flightPerAdultPence)} per adult (assumed)`],
                  ["Estimated group flights", pounds(option.estimatedGroupFlightsPence)],
                  ["Your group spending allowance", pounds(option.spendingPence)],
                  [
                    "Left for accommodation and extras",
                    option.remainingForStayPence > 0
                      ? pounds(option.remainingForStayPence)
                      : option.remainingForStayPence === 0
                        ? "£0 — no room for a stay"
                        : `${pounds(-option.remainingForStayPence)} over budget before a stay`,
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted">{label}</dt>
                    <dd className="mt-1 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-sm text-muted">Accommodation cost unknown. This is not a verified within-budget holiday.</p>
              <h4 className="mt-5 font-medium">Your activities</h4>
              <ul className="mt-2 space-y-3 text-sm">
                {option.evidence.map((evidence) => (
                  <li key={evidence.activity}>
                    <p>
                      {evidence.activity}: {evidence.status === "supported" ? "places found nearby" : "not verified"}
                    </p>
                    {evidence.places.map((place, index) => (
                      <span key={`${place.sourceUrl}:${index}`} className="mr-3 inline-block">
                        <a className="inline-flex min-h-11 items-center underline" href={place.sourceUrl} target="_blank" rel="noopener noreferrer">
                          {place.name}
                        </a>
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">
                Retrieved {new Date(option.retrievedAt).toLocaleString("en-GB")}. Fare age is unknown; retrieval is not a price recheck.
              </p>
              {option.geonamesId && (
                <a
                  href={`https://www.geonames.org/${option.geonamesId}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex min-h-11 items-center text-sm underline"
                >
                  Destination geography: GeoNames
                </a>
              )}
              <a
                href={option.onwardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-primary px-4 py-2 text-primary"
              >
                Check current flights on Aviasales
              </a>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs leading-relaxed text-muted">
        Flight estimates: Aviasales / Travelpayouts. Geography:{" "}
        <a className="underline" href="https://www.geonames.org/">
          GeoNames
        </a>
        . Activity data:{" "}
        <a className="underline" href="https://www.geoapify.com/">
          Powered by Geoapify
        </a>{" "}
        and{" "}
        <a className="underline" href="https://www.openstreetmap.org/copyright">
          © OpenStreetMap contributors
        </a>
        . Listings may be incomplete; opening hours and availability are not verified.
      </p>
    </section>
  );
}
