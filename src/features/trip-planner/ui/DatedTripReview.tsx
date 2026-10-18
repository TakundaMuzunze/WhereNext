import type { DatedTripRequest } from "@/entities/trip/model/types";
import { serializeDatedTripRequest, tripNights } from "../lib/datedPlannerSearchParams";
import { tripTypes } from "@/shared/data/tripTypes";
import Link from "next/link";

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

  const details = [
    ["Departure airport", airportName],
    ["Outbound date", request.outboundDate],
    ["Return date", request.returnDate],
    ["Duration", `${nights} nights · ${spendingDays} spending days`],
    ["Adults", String(request.adultCount)],
    ["Group holiday budget", formatPenceAsPounds(request.groupBudgetPence)],
    ["Daily allowance per adult", formatPenceAsPounds(request.dailyAllowancePerPersonPence)],
    ["Group spending allowance", formatPenceAsPounds(groupSpendingAllowance)],
    ["Trip type", selectedTripType?.label],
    ["Activities", request.preferences.activities.join(", ")],
  ];

  return (
    <section aria-label="Your dated trip request" className="rounded-3xl border border-primary/20 bg-background p-6 text-text">
      <h2 className="text-2xl font-semibold">Your trip request</h2>
      <dl className="mt-6 grid gap-5 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-sm text-text/65">{label}</dt>
            <dd className="mt-1 font-medium wrap-break-word">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 text-sm">
        Your group budget includes flights, accommodation and the spending allowance. Spending covers both travel days. These are your planning
        inputs; no current prices or availability have been searched.
      </p>
      {allowanceExceedsBudget && (
        <p role="status" className="mt-3 font-medium">
          Your spending allowance alone exceeds your group budget by {formatPenceAsPounds(amountOverBudget)}.
        </p>
      )}
      <Link href={editRequestHref} className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-primary/40 px-4 py-2">
        Edit dated request
      </Link>
    </section>
  );
}
