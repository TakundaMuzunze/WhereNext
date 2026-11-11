"use client";

import { useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createDatedTripDatesSchema } from "@/entities/trip/model/datedTripRequestSchema";
import { londonToday } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { discoveryRequestSchema, nightsBetween, type DiscoveryRequest } from "../model/discoveryRequest";
import { departureAirportLabel, departureAirportSchema, type DepartureAirportCode } from "@/entities/trip/model/departureAirport";
import { serializeDiscoveryRequest } from "../lib/discoveryRequest";
import { DepartureAirportSelect } from "./DepartureAirportSelect";

export function DestinationTravelPanel({ destinationName, request }: { destinationName: string; request: DiscoveryRequest }) {
  const router = useRouter();
  const pathname = usePathname();
  const [airport, setAirport] = useState<DepartureAirportCode | "">(request.departureAirportCode ?? "");
  const [outboundDate, setOutboundDate] = useState(request.timing.kind === "exact" ? request.timing.outboundDate : "");
  const [returnDate, setReturnDate] = useState(request.timing.kind === "exact" ? request.timing.returnDate : "");
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasDates = Boolean(outboundDate || returnDate || request.timing.kind === "exact");
    if (hasDates && !createDatedTripDatesSchema(londonToday()).safeParse({ outboundDate, returnDate }).success) {
      showError("Choose valid departure and return dates 1–28 nights apart, departing within the next 365 days.");
      return;
    }
    const validation = discoveryRequestSchema.safeParse({
      ...request,
      departureAirportCode: airport || undefined,
      ...(hasDates
        ? {
            timing: { kind: "exact", outboundDate, returnDate },
            approximateNights: nightsBetween(outboundDate, returnDate),
          }
        : {}),
    });
    if (!validation.success) {
      showError("Check your departure airport and trip details before saving.");
      return;
    }
    setError(null);
    router.replace(`${pathname}?${serializeDiscoveryRequest(validation.data)}#getting-there`, { scroll: false });
  }

  return (
    <section
      id="getting-there"
      aria-labelledby="getting-there-title"
      className="mt-8 scroll-mt-28 rounded-2xl border border-border bg-surface p-5 sm:p-8"
    >
      <p className="text-xs tracking-[0.14em] text-primary uppercase">When you’re ready</p>
      <h2 id="getting-there-title" className="mt-3 font-serif text-3xl">
        Let’s look at getting there.
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        Your destination and trip brief are already here. Add the travel details you’re ready to plan.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-secondary p-5">
        <div className="min-w-0">
          <p className="text-xs text-muted">Flying from</p>
          <p className="mt-1 font-serif text-2xl">{airport || "Your airport"}</p>
          <p className="mt-1 text-xs text-muted">{departureAirportLabel(airport || undefined)}</p>
        </div>
        <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-xs text-muted">Your destination</p>
          <p className="mt-1 font-serif text-2xl wrap-break-word">{destinationName}</p>
          <p className="mt-1 text-xs text-muted">Arrival airport still to assess</p>
        </div>
      </div>
      <form noValidate aria-label="Destination travel details" onSubmit={saveDetails} className="mt-6">
        <DepartureAirportSelect
          value={airport}
          onChange={(value) => {
            const parsed = departureAirportSchema.safeParse(value);
            if (value === "") setAirport("");
            else if (parsed.success) setAirport(parsed.data);
          }}
        />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm">
            Outbound date
            <input
              type="date"
              value={outboundDate}
              onChange={(event) => setOutboundDate(event.target.value)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-text"
            />
          </label>
          <label className="text-sm">
            Return date
            <input
              type="date"
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-text"
            />
          </label>
        </div>
        <p className="mt-4 text-xs leading-6 text-muted">
          {request.timing.kind === "exact"
            ? "Your exact dates are carried over."
            : "Keep your timing flexible, or choose exact dates for future travel checks."}{" "}
          Saving dates updates your trip duration and climate context. A nearby arrival airport may also need a transfer to {destinationName}.
        </p>
        {error && (
          <p ref={errorRef} tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-border p-4 text-sm">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="min-h-11 cursor-pointer rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Save travel details
          </button>
          <button
            type="button"
            disabled
            className="min-h-11 cursor-not-allowed rounded-xl border border-border px-5 py-3 text-sm text-muted opacity-60"
          >
            Check travel options
          </button>
        </div>
      </form>
      <p className="mt-4 text-xs leading-6 text-muted">
        Live travel checks aren’t available yet. No routes, arrival airports, transfers, prices or availability have been verified.
      </p>
    </section>
  );
}
