import { formatTripDate, formatTripMoney } from "@/features/trip-planner/ui/DatedTripSummary";
import { poundsToPence } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import { nightsBetween, type DiscoveryRequest } from "../model/discoveryRequest";

export type DiscoveryPlannerDraft = {
  timing: DiscoveryRequest["timing"]["kind"];
  month: string;
  outboundDate: string;
  returnDate: string;
  nights: string;
  adults: string;
  budget: string;
  activities: string[];
};

export function DiscoveryPlannerSummary({ draft }: { draft: DiscoveryPlannerDraft }) {
  const nights = draft.timing === "exact" ? nightsBetween(draft.outboundDate, draft.returnDate) : Number(draft.nights);
  const adults = Number(draft.adults);
  const budget = poundsToPence(draft.budget);
  let timingLabel = "Flexible timing";

  if (draft.timing === "month") {
    timingLabel = /^20\d{2}-(0[1-9]|1[0-2])$/.test(draft.month)
      ? new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(draft.month + "-01T00:00:00Z"))
      : "Choose a month";
  } else if (draft.timing === "exact") {
    timingLabel = `${formatTripDate(draft.outboundDate)} – ${formatTripDate(draft.returnDate)}`;
  }

  return (
    <aside aria-label="Your holiday taking shape" className="min-w-0 self-start border-t-4 border-primary pt-5 lg:sticky lg:top-28">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Your holiday, taking shape</p>
      <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight">
        Somewhere good.
        <br />
        Chosen by you.
      </h2>
      {draft.activities.length > 0 ? (
        <ul aria-label="Your trip interests" className="mt-5 flex flex-wrap gap-2">
          {draft.activities.map((activity) => (
            <li key={activity} className="max-w-full rounded-full border border-border px-2.5 py-1 text-xs wrap-break-word">
              {activity}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted">Start with a few things you love.</p>
      )}
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">When</dt>
          <dd className="text-right">{timingLabel}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Stay</dt>
          <dd>{Number.isInteger(nights) && nights >= 1 && nights <= 28 ? `${nights} ${nights === 1 ? "night" : "nights"}` : "1–28 nights"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Your people</dt>
          <dd>{Number.isInteger(adults) && adults >= 1 && adults <= 9 ? `${adults} ${adults === 1 ? "adult" : "adults"}` : "1–9 adults"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Group budget</dt>
          <dd>{budget !== undefined && budget >= 100 && budget <= 10_000_000 ? formatTripMoney(budget) : "Your call"}</dd>
        </div>
      </dl>
      <p className="mt-6 border-t border-border pt-5 text-xs leading-6 text-muted">
        Your destination is still open. That’s what we’re here to help with.
      </p>
    </aside>
  );
}
