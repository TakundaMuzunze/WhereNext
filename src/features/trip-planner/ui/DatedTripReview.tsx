import type { DatedTripRequest } from "@/entities/trip/model/types";
import { serializeDatedTripRequest, tripNights } from "../lib/datedPlannerSearchParams";
import { tripTypes } from "@/shared/data/tripTypes";
import Link from "next/link";
import { formatTripDate } from "./DatedTripSummary";

type DatedTripReviewProps = {
  request: DatedTripRequest;
};

function formatPenceAsPounds(pence: number): string {
  const formatter = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  });

  return formatter.format(pence / 100);
}

export function DatedTripReview({ request }: DatedTripReviewProps) {
  const nights = tripNights(request);
  const spendingDays = nights + 1;
  const allowanceForOneAdult = request.dailyAllowancePerPersonPence * spendingDays;
  const groupSpendingAllowance = allowanceForOneAdult * request.adultCount;
  const allowanceExceedsBudget = groupSpendingAllowance > request.groupBudgetPence;
  const amountOverBudget = groupSpendingAllowance - request.groupBudgetPence;

  const selectedTripType = tripTypes.find((tripType) => tripType.value === request.preferences.tripType);
  const airportNames = {
    LHR: "London Heathrow (LHR)",
    MAN: "Manchester (MAN)",
  };
  const airportName = airportNames[request.departureAirportCode];
  const editRequestHref = `/planner?${serializeDatedTripRequest(request)}`;

  const sections = [
    {
      title: "The who & when",
      anchor: "essentials",
      edit: "Edit dates & adults",
      details: [
        ["Departure airport", airportName],
        ["Outbound date", formatTripDate(request.outboundDate)],
        ["Return date", formatTripDate(request.returnDate)],
        ["Duration", `${nights} nights · ${spendingDays} spending days`],
        ["Adults", String(request.adultCount)],
      ],
    },
    {
      title: "Room for the good stuff",
      anchor: "budget",
      edit: "Edit budget",
      details: [
        ["Group holiday budget", formatPenceAsPounds(request.groupBudgetPence)],
        ["Daily allowance per adult", formatPenceAsPounds(request.dailyAllowancePerPersonPence)],
        ["Group spending allowance", formatPenceAsPounds(groupSpendingAllowance)],
        [
          "Left for flights + stay",
          allowanceExceedsBudget ? "Spending exceeds your budget" : formatPenceAsPounds(request.groupBudgetPence - groupSpendingAllowance),
        ],
      ],
    },
    {
      title: "Your kind of holiday",
      anchor: "style",
      edit: "Edit holiday style",
      details: [
        ["Trip type", selectedTripType?.label],
        ["Activities", request.preferences.activities.join(", ")],
      ],
    },
  ];

  return (
    <section aria-label="Your dated trip request" className="rounded-2xl bg-secondary p-6 text-text sm:p-8">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Your holiday brief</p>
      <h2 className="mt-3 font-serif text-3xl tracking-tight">Now that sounds like a plan.</h2>
      {sections.map(({ title, anchor, edit, details }) => (
        <section key={anchor} className="mt-7 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-4">
            <h3 className="text-lg font-medium">{title}</h3>
            <Link
              href={`${editRequestHref}#${anchor}`}
              className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4"
            >
              {edit}
            </Link>
          </div>
          <dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-muted">{label}</dt>
                <dd className="mt-1 font-medium wrap-break-word">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
        Your group budget includes flights, accommodation and the spending allowance. Spending covers both travel days. These are your planning
        inputs; no current prices or availability have been searched.
      </p>
      {groupSpendingAllowance >= request.groupBudgetPence && (
        <p role="status" className="mt-3 font-medium">
          {allowanceExceedsBudget
            ? `Your spending allowance alone exceeds your group budget by ${formatPenceAsPounds(amountOverBudget)}.`
            : "Your daily spending leaves £0 for flights and accommodation."}
        </p>
      )}
      <Link href={editRequestHref} className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-primary/40 px-4 py-2">
        Edit dated request
      </Link>
    </section>
  );
}
