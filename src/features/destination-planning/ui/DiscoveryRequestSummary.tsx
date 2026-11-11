import Link from "next/link";
import { departureAirportLabel } from "@/entities/trip/model/departureAirport";
import type { DiscoveryRequest } from "../model/discoveryRequest";
import { serializeDiscoveryRequest } from "../lib/discoveryRequest";
import { formatTripDate, formatTripMoney } from "@/features/trip-planner/ui/DatedTripSummary";

export function discoveryTimingLabel(request: DiscoveryRequest): string {
  if (request.timing.kind === "flexible") {
    return "Flexible timing";
  }

  if (request.timing.kind === "month") {
    return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
      new Date(`${request.timing.month}-01T00:00:00Z`),
    );
  }

  return `${formatTripDate(request.timing.outboundDate)} - ${formatTripDate(request.timing.returnDate)}`;
}

export function DiscoveryRequestSummary({ request }: { request: DiscoveryRequest }) {
  const timingLabel = discoveryTimingLabel(request);
  const editHref = `/planner?${serializeDiscoveryRequest(request)}`;

  return (
    <section aria-label="Your trip request" className="rounded-2xl border border-border bg-secondary px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6">
          <span className="font-medium">
            {request.approximateNights} nights · {request.adultCount} adults
          </span>
          <span className="text-muted">
            {" "}
            · {timingLabel}
            {request.groupBudgetPence !== undefined && <> · {formatTripMoney(request.groupBudgetPence)} saved budget</>}
          </span>
          {request.departureAirportCode && (
            <span className="mt-1 block text-xs text-muted">Saved airport: {departureAirportLabel(request.departureAirportCode)}</span>
          )}
        </p>
        <Link href={editHref} className="inline-flex min-h-11 cursor-pointer items-center text-sm text-primary underline">
          Edit request
        </Link>
      </div>
      <details className="text-sm">
        <summary className="min-h-11 cursor-pointer py-3 text-primary">View request details</summary>
        <p className="mt-2 leading-6">{request.activities.join(", ")}</p>
        <p className="mt-3 leading-6 text-muted">
          Nearby activities use named listing evidence. Sightseeing preferences assess historical climate only. Nights, adults and any saved budget or
          airport are planning context; prices have not been checked.
        </p>
      </details>
    </section>
  );
}
