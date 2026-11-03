"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { discoveryInterests, type DiscoveryRequest } from "../model/discoveryRequest";
import { parseDiscoveryRequest, serializeDiscoveryRequest } from "../lib/discoveryRequest";
import { poundsToPence } from "@/features/trip-planner/lib/datedPlannerSearchParams";

const inputClassName = "mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-text";

type DiscoveryPlannerProps = {
  initialRequest?: DiscoveryRequest;
  invalidLink?: boolean;
};

export function DiscoveryPlanner({ initialRequest, invalidLink = false }: DiscoveryPlannerProps) {
  const router = useRouter();
  const [timing, setTiming] = useState(initialRequest?.timing.kind ?? "flexible");
  const [month, setMonth] = useState(initialRequest?.timing.kind === "month" ? initialRequest.timing.month : "");
  const [outboundDate, setOutboundDate] = useState(initialRequest?.timing.kind === "exact" ? initialRequest.timing.outboundDate : "");
  const [returnDate, setReturnDate] = useState(initialRequest?.timing.kind === "exact" ? initialRequest.timing.returnDate : "");
  const [nights, setNights] = useState(String(initialRequest?.approximateNights ?? 5));
  const [adults, setAdults] = useState(String(initialRequest?.adultCount ?? 2));
  const [budget, setBudget] = useState(initialRequest ? (initialRequest.groupBudgetPence / 100).toFixed(2) : "");
  const [activities, setActivities] = useState(initialRequest?.activities ?? []);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleInterest(interest: string) {
    if (activities.includes(interest)) {
      setActivities(activities.filter((activity) => activity !== interest));
      return;
    }

    setActivities([...activities, interest]);
  }

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budgetPence = poundsToPence(budget);
    const request = parseDiscoveryRequest({
      kind: "discovery",
      timing,
      month,
      outbound: outboundDate,
      return: returnDate,
      nights,
      adults,
      budget: String(budgetPence),
      activity: activities,
    });

    if (!request) {
      setErrorMessage(
        "Choose 1-10 interests, 1-28 nights, 1-9 adults and a group budget from £1 to £100,000. Exact dates must be 1–28 nights apart.",
      );
      return;
    }

    router.push(`/results?${serializeDiscoveryRequest(request)}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 pt-28 pb-20 text-text">
      <p className="text-sm text-primary">Your next destination</p>
      <h1 className="mt-3 font-serif text-4xl">What would make a good trip?</h1>
      <p className="mt-4 leading-7 text-muted">
        Start with your interests. You can explore places before choosing an airport or checking travel costs.
      </p>
      {invalidLink && (
        <p role="alert" className="mt-6">
          This request link is invalid. Please enter your trip details again.
        </p>
      )}

      <form onSubmit={submitRequest} className="mt-8 space-y-8">
        <fieldset className="rounded-2xl border border-border p-5 sm:p-7">
          <legend className="px-2 text-xl font-medium">When and how long?</legend>
          <div>
            <label htmlFor="discovery-timing">Timing</label>
            <select
              id="discovery-timing"
              className={inputClassName}
              value={timing}
              onChange={(event) => {
                const value = event.target.value;
                if (value === "flexible" || value === "month" || value === "exact") {
                  setTiming(value);
                }
              }}
            >
              <option value="flexible">I&apos;m flexible</option>
              <option value="month">I have a preferred month</option>
              <option value="exact">I know my dates</option>
            </select>
          </div>
          {timing === "month" && (
            <label className="mt-5 block">
              Preferred month
              <input required type="month" className={inputClassName} value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
          )}
          {timing === "exact" && (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label>
                Departure date
                <input
                  required
                  type="date"
                  className={inputClassName}
                  value={outboundDate}
                  onChange={(event) => setOutboundDate(event.target.value)}
                />
              </label>
              <label>
                Return date
                <input required type="date" className={inputClassName} value={returnDate} onChange={(event) => setReturnDate(event.target.value)} />
              </label>
            </div>
          )}
          {timing !== "exact" && (
            <label className="mt-5 block">
              Approximate nights
              <input
                required
                type="number"
                min="1"
                max="28"
                step="1"
                className={inputClassName}
                value={nights}
                onChange={(event) => setNights(event.target.value)}
              />
            </label>
          )}
          {timing === "exact" && <p className="mt-4 text-sm text-muted">Your dates determine the number of nights.</p>}
        </fieldset>

        <fieldset className="rounded-2xl border border-border p-5 sm:p-7">
          <legend className="px-2 text-xl font-medium">Your group and budget</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <label>
              Adults
              <input
                required
                type="number"
                min="1"
                max="9"
                step="1"
                className={inputClassName}
                value={adults}
                onChange={(event) => setAdults(event.target.value)}
              />
            </label>
            <label>
              Group budget (GBP)
              <input
                required
                type="number"
                min="1"
                max="100000"
                step="0.01"
                className={inputClassName}
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </label>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            Your total holiday budget for everyone, including travel, accommodation and spending. We cannot establish affordability until there is
            enough cost evidence.
          </p>
        </fieldset>

        <fieldset className="rounded-2xl border border-border p-5 sm:p-7">
          <legend className="px-2 text-xl font-medium">What would you like to do?</legend>
          <p className="mb-5 text-sm text-muted">
            Choose up to 10 interests. Each has equal importance. Some interests do not yet have verified evidence.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {discoveryInterests.map((interest) => (
              <label key={interest} className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={activities.includes(interest)}
                  onChange={() => toggleInterest(interest)}
                  className="size-4 accent-primary"
                />
                {interest}
              </label>
            ))}
          </div>
        </fieldset>

        {errorMessage && (
          <p role="alert" className="rounded-xl border border-border p-4">
            {errorMessage}
          </p>
        )}
        <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-primary px-6 py-3 text-primary-foreground">
          Explore destinations
        </button>
      </form>
      <Link href="/planner?kind=dated" className="mt-8 inline-flex min-h-11 cursor-pointer items-center text-sm text-primary underline">
        Open the existing dated travel planner
      </Link>
    </main>
  );
}
