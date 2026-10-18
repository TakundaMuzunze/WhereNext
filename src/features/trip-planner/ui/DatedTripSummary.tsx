import { ArrowRight, Info } from "lucide-react";
import type { DatedTripDraft } from "../lib/datedTripDraft";
import { getDatedTripFeedback } from "../lib/datedTripFeedback";
import { tripTypes } from "@/shared/data/tripTypes";
import { z } from "zod";

export function formatTripMoney(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: pence % 100 === 0 ? 0 : 2 }).format(pence / 100);
}

export function formatTripDate(date: string): string {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return z.iso.date().safeParse(date).success && Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(timestamp)
    : "Choose a date";
}

export function DatedTripSummary({ draft, guided = false }: { draft: DatedTripDraft; guided?: boolean }) {
  const { nights, adults, budget, allowance, spending, remaining } = getDatedTripFeedback(draft);
  const validStay = nights !== undefined;
  const validAdults = adults !== undefined && adults >= 1 && adults <= 9;
  const validBudget = budget !== undefined;
  const type = tripTypes.find(({ value }) => value === draft.tripType);

  return (
    <aside
      aria-label="Your holiday taking shape"
      className={guided ? "self-start border-t-4 border-primary pt-5" : "self-start rounded-2xl bg-secondary p-6 sm:p-7"}
    >
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Your holiday, taking shape</p>
      <h2 className="mt-4 font-serif text-3xl leading-tight tracking-tight">
        {draft.tripType === "beach-holiday"
          ? "Days by the sea. Plans with your people."
          : type
            ? `${type.label}. Good company.`
            : "Somewhere good. Together."}
      </h2>
      <div className="mt-6 flex items-center justify-between gap-4 border-b border-dashed border-border pb-6">
        <div>
          <p className="text-2xl font-medium">{draft.departureAirportCode || "From?"}</p>
          <p className="mt-1 text-xs text-muted">
            {draft.departureAirportCode === "LHR" ? "London Heathrow" : draft.departureAirportCode === "MAN" ? "Manchester" : "Choose your airport"}
          </p>
        </div>
        <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <div>
          <p className="text-2xl font-medium">Next?</p>
          <p className="mt-1 text-xs text-muted">Somewhere good</p>
        </div>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Outbound</dt>
          <dd>{formatTripDate(draft.outboundDate)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Return</dt>
          <dd>{formatTripDate(draft.returnDate)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Your group</dt>
          <dd>{validAdults ? `${adults} ${adults === 1 ? "adult" : "adults"}` : "1–9 adults"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Stay</dt>
          <dd>{validStay ? `${nights} ${nights === 1 ? "night" : "nights"}` : "1–28 nights"}</dd>
        </div>
      </dl>
      <div aria-live="polite" aria-atomic="true" className="mt-6 border-t border-border pt-5">
        <p className="text-xs text-muted">Whole-group budget</p>
        <p className="mt-1 text-3xl tracking-tight tabular-nums">{validBudget ? formatTripMoney(budget) : "Your call"}</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Spending set aside</dt>
            <dd className="tabular-nums">{spending !== undefined ? formatTripMoney(spending) : "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">{remaining !== undefined && remaining < 0 ? "Over your budget" : "Left for flights + stay"}</dt>
            <dd className="tabular-nums">{remaining !== undefined ? formatTripMoney(Math.abs(remaining)) : "—"}</dd>
          </div>
        </dl>
        {spending !== undefined && allowance !== undefined && (
          <p className="mt-3 text-xs text-muted">
            {formatTripMoney(allowance)} × {adults} adults × {(nights ?? 0) + 1} spending days, including both travel days.
          </p>
        )}
        {remaining !== undefined && remaining <= 0 && (
          <p role="status" className="mt-3 text-sm">
            {remaining === 0 ? "Your daily spending leaves £0 for flights and accommodation." : "Your spending allowance exceeds the group budget."}{" "}
            <a href="#budget" className="underline underline-offset-4">
              Adjust your budget or daily spending
            </a>
            .
          </p>
        )}
      </div>
      {draft.activities.length > 0 && <p className="mt-5 border-t border-border pt-4 text-sm text-muted">{draft.activities.join(" · ")}</p>}
      <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-muted">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Planning only. No live prices or availability checked.
      </p>
    </aside>
  );
}
