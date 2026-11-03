import Link from "next/link";
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
    <section aria-label="Your trip request" className="rounded-2xl border border-border bg-secondary p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">{timingLabel}</p>
        <Link href={editHref} className="inline-flex min-h-11 items-center text-sm text-primary underline">
          Edit request
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        {request.approximateNights} nights · {request.adultCount} adults · {formatTripMoney(request.groupBudgetPence)} group budget
      </p>
      <details className="mt-3 text-sm">
        <summary className="min-h-11 cursor-pointer py-3 text-primary">View request details</summary>
        <p className="mt-2 leading-6">{request.activities.join(", ")}</p>
        <p className="mt-3 leading-6 text-muted">
          Interests are equally important. Duration is your plan, not a recommended stay length. Budget fit and seasonal suitability remain unknown
          without sufficient evidence.
        </p>
      </details>
    </section>
  );
}
