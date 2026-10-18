"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DatedTripRequest } from "@/entities/trip/model/types";
import { createDatedTripRequestSchema } from "@/entities/trip/model/datedTripRequestSchema";
import { londonToday, poundsToPence, serializeDatedTripRequest } from "../lib/datedPlannerSearchParams";
import { tripTypes } from "@/shared/data/tripTypes";
import { ActivitiesStep } from "./steps/ActivitiesStep";
import Link from "next/link";

type DatedTripFormProps = {
  initialRequest?: DatedTripRequest;
  invalidLink?: boolean;
};

type TextField = "departureAirportCode" | "outboundDate" | "returnDate" | "adultCount" | "budget" | "allowance";

export function DatedTripForm({ initialRequest, invalidLink = false }: DatedTripFormProps) {
  const router = useRouter();

  // Form inputs stay as strings so an empty or unfinished value can be edited.
  // Only a successfully validated submission becomes a DatedTripRequest.
  const [draft, setDraft] = useState({
    departureAirportCode: initialRequest?.departureAirportCode ?? "",
    outboundDate: initialRequest?.outboundDate ?? "",
    returnDate: initialRequest?.returnDate ?? "",
    adultCount: String(initialRequest?.adultCount ?? 2),
    budget: initialRequest ? (initialRequest.groupBudgetPence / 100).toFixed(2) : "",
    allowance: initialRequest ? (initialRequest.dailyAllowancePerPersonPence / 100).toFixed(2) : "",
    tripType: initialRequest?.preferences.tripType ?? "",
    activities: initialRequest?.preferences.activities ?? [],
  });

  const errorLabels: Record<string, string> = {
    departureAirportCode: "Departure airport",
    outboundDate: "Outbound date",
    returnDate: "Return date",
    adultCount: "Adults",
    groupBudgetPence: "Group holiday budget",
    dailyAllowancePerPersonPence: "Daily spending allowance",
    "preferences.tripType": "Trip type",
    "preferences.activities": "Activities",
  };

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedTripType = tripTypes.find((tripType) => tripType.value === draft.tripType);

  function updateTextField(field: TextField, value: string): void {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function selectTripType(value: string): void {
    const selectedOption = tripTypes.find((tripType) => tripType.value === value);

    setDraft((currentDraft) => ({
      ...currentDraft,
      tripType: selectedOption?.value ?? "",
      // Activities belong to the selected trip type, so a new type starts fresh.
      activities: [],
    }));
  }

  function toggleActivity(activity: string): void {
    setDraft((currentDraft) => {
      const isAlreadySelected = currentDraft.activities.includes(activity);
      let updatedActivities: string[];

      if (isAlreadySelected) {
        updatedActivities = currentDraft.activities.filter((selectedActivity) => selectedActivity !== activity);
      } else {
        updatedActivities = [...currentDraft.activities, activity];
      }

      return {
        ...currentDraft,
        activities: updatedActivities,
      };
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Convert the form representation before asking Zod to validate the request.
    const adultCountContainsOnlyDigits = /^\d+$/.test(draft.adultCount);
    const adultCount = adultCountContainsOnlyDigits ? Number(draft.adultCount) : undefined;
    const candidateRequest = {
      kind: "dated",
      currency: "GBP",
      departureAirportCode: draft.departureAirportCode,
      outboundDate: draft.outboundDate,
      returnDate: draft.returnDate,
      adultCount,
      groupBudgetPence: poundsToPence(draft.budget),
      dailyAllowancePerPersonPence: poundsToPence(draft.allowance),
      preferences: {
        tripType: draft.tripType,
        activities: draft.activities,
      },
    };

    const today = londonToday();
    const schema = createDatedTripRequestSchema(today);
    const result = schema.safeParse(candidateRequest);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};

      for (const issue of result.error.issues) {
        // A nested Zod path becomes a key such as "preferences.activities".
        const fieldPath = issue.path.join(".");
        fieldErrors[fieldPath] = issue.message;
      }

      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    const query = serializeDatedTripRequest(result.data);
    window.history.replaceState(window.history.state, "", `/planner?${query}`);
    router.push(`/results?${query}`);
  }

  const inputClass = "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-primary/30 bg-background px-3 py-2 text-text";

  return (
    <div className="mx-auto min-h-screen max-w-4xl px-6 py-28 text-text">
      <h1 className="text-3xl font-semibold">Plan a dated group holiday</h1>
      <p className="mt-3">Choose exact dates and a supported UK airport. Adults in economy, GBP, and a stay of 1-28 nights.</p>
      <p className="mt-2 text-sm">
        Initial destination scope: France, Spain, Portugal, Italy, Greece and Malta. This request does not search current prices.
      </p>
      {invalidLink && (
        <p role="alert" className="mt-5">
          This dated request link is invalid or has expired. Please enter a new request.
        </p>
      )}
      <form onSubmit={submit} noValidate className="mt-8 space-y-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label>
            Departure airport
            <select
              required
              className={inputClass}
              value={draft.departureAirportCode}
              onChange={(event) => updateTextField("departureAirportCode", event.target.value)}
            >
              <option value="">Choose an airport</option>
              <option value="LHR">London Heathrow (LHR)</option>
              <option value="MAN">Manchester (MAN)</option>
            </select>
          </label>
          <label>
            Outbound date
            <input
              type="date"
              required
              className={inputClass}
              value={draft.outboundDate}
              onChange={(event) => updateTextField("outboundDate", event.target.value)}
            />
          </label>

          <label>
            Return date
            <input
              type="date"
              required
              className={inputClass}
              value={draft.returnDate}
              onChange={(event) => updateTextField("returnDate", event.target.value)}
            />
          </label>

          <label>
            Adults
            <input
              type="number"
              min="1"
              max="9"
              step="1"
              required
              className={inputClass}
              value={draft.adultCount}
              onChange={(event) => updateTextField("adultCount", event.target.value)}
            />
          </label>

          <label>
            Group holiday budget (GBP)
            <input
              type="number"
              min="1"
              max="100000"
              step="0.01"
              required
              className={inputClass}
              value={draft.budget}
              onChange={(event) => updateTextField("budget", event.target.value)}
            />
          </label>

          <label>
            Daily spending allowance per adult (GBP)
            <input
              type="number"
              min="0"
              max="1000"
              step="0.01"
              required
              className={inputClass}
              value={draft.allowance}
              onChange={(event) => updateTextField("allowance", event.target.value)}
            />
          </label>
        </div>
        <p className="text-sm">
          Budget is for the whole group, including flights, accommodation and spending. Daily allowance covers each adult on both travel days and
          every day between them; zero is allowed. Departure must be within 365 days.
        </p>
        <label className="block">
          Trip type
          <select aria-label="Trip type" className={inputClass} value={draft.tripType} onChange={(event) => selectTripType(event.target.value)}>
            <option value="">Choose a trip type</option>
            {tripTypes.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ActivitiesStep availableActivities={selectedTripType?.activities ?? []} selectedActivities={draft.activities} onToggle={toggleActivity} />
        {Object.keys(errors).length > 0 && (
          <div role="alert" className="rounded-xl border border-primary/40 p-4">
            <p className="font-semibold">Please check your request</p>
            <ul className="mt-2 list-disc pl-5">
              {Object.entries(errors).map(([field, message]) => (
                <li key={field}>
                  {errorLabels[field] ?? "Activities"}: {message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <button type="submit" className="min-h-11 rounded-xl bg-primary px-5 py-3 text-white dark:text-[#101214]">
          Review trip request
        </button>
      </form>
      <Link href="/planner" className="mt-6 inline-flex min-h-11 items-center underline">
        Use the month-based planner
      </Link>
    </div>
  );
}
