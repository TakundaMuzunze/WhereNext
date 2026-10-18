"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { DatedTripRequest } from "@/entities/trip/model/types";
import { createDatedTripRequestSchema } from "@/entities/trip/model/datedTripRequestSchema";
import { londonToday, poundsToPence, serializeDatedTripRequest } from "../lib/datedPlannerSearchParams";
import { tripTypes } from "@/shared/data/tripTypes";
import { ActivitiesStep } from "./steps/ActivitiesStep";
import { DatedTripSummary, formatTripMoney } from "./DatedTripSummary";
import { getDatedTripFeedback } from "../lib/datedTripFeedback";
import { ArrowRight, Building2, Heart, Landmark, Leaf, Mountain, Music, Sun, Utensils } from "lucide-react";
import Link from "next/link";
import { serializeDatedTripDraft, type DatedTripDraft } from "../lib/datedTripDraft";

type DatedTripFormProps = {
  initialRequest?: DatedTripRequest;
  initialDraft?: DatedTripDraft;
  invalidLink?: boolean;
};

type TextField = "departureAirportCode" | "outboundDate" | "returnDate" | "adultCount" | "budget" | "allowance";

const steps = ["essentials", "budget", "style"] as const;
type GuidedStep = (typeof steps)[number];
const stepFields: Record<GuidedStep, string[]> = {
  essentials: ["departureAirportCode", "adultCount", "outboundDate", "returnDate"],
  budget: ["budget", "allowance"],
  style: ["tripType", "activities"],
};
function readStep(): GuidedStep {
  const hash = window.location.hash;
  if (hash === "#budget" || hash === "#trip-budget" || hash === "#trip-allowance") return "budget";
  if (hash === "#style" || hash === "#trip-tripType" || hash === "#trip-activities") return "style";
  return "essentials";
}
function subscribeStep(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export function DatedTripForm({ initialRequest, initialDraft, invalidLink = false }: DatedTripFormProps) {
  const router = useRouter();
  const step = useSyncExternalStore(subscribeStep, readStep, () => "essentials" as const);
  const formHeading = useRef<HTMLHeadingElement>(null);
  function goToStep(next: GuidedStep, field?: string) {
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}#${next}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    requestAnimationFrame(() => {
      if (field) {
        const element = document.getElementById(`trip-${field}`);
        const target = element?.matches("input, select") ? element : element?.querySelector("button");
        target?.focus();
      } else formHeading.current?.focus();
    });
  }

  // Form inputs stay as strings so an empty or unfinished value can be edited.
  // Only a successfully validated submission becomes a DatedTripRequest.
  const [draft, setDraft] = useState<DatedTripDraft>(
    initialDraft ?? {
      departureAirportCode: initialRequest?.departureAirportCode ?? "",
      outboundDate: initialRequest?.outboundDate ?? "",
      returnDate: initialRequest?.returnDate ?? "",
      adultCount: String(initialRequest?.adultCount ?? 2),
      budget: initialRequest ? (initialRequest.groupBudgetPence / 100).toFixed(2) : "",
      allowance: initialRequest ? (initialRequest.dailyAllowancePerPersonPence / 100).toFixed(2) : "",
      tripType: initialRequest?.preferences.tripType ?? "",
      activities: initialRequest?.preferences.activities ?? [],
    },
  );

  // Only edits create draft URLs. Opening a completed request should leave its
  // canonical URL alone until the traveller changes something.
  const [hasEdited, setHasEdited] = useState(false);

  useEffect(() => {
    if (!hasEdited) {
      return;
    }

    const query = serializeDatedTripDraft(draft);
    window.history.replaceState(window.history.state, "", `/planner?${query}${window.location.hash}`);
  }, [draft, hasEdited]);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const revealActivities = useRef(false);
  const activitiesRef = useRef<HTMLDivElement>(null);
  const feedback = getDatedTripFeedback(draft);
  const errors = Object.fromEntries(
    Object.entries(feedback.errors).filter(
      ([field]) =>
        submitted || touched[field] || ((field === "outboundDate" || field === "returnDate") && Boolean(draft.outboundDate && draft.returnDate)),
    ),
  );
  const errorLabels: Record<string, string> = {
    departureAirportCode: "Departure airport",
    adultCount: "Adults",
    outboundDate: "Outbound date",
    returnDate: "Return date",
    budget: "Group holiday budget",
    allowance: "Daily spending allowance",
    tripType: "Holiday style",
    activities: "Activities",
  };

  useEffect(() => {
    if (!revealActivities.current) return;
    activitiesRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      block: "nearest",
    });
    revealActivities.current = false;
  }, [draft.tripType]);

  function fieldProps(field: TextField) {
    return {
      id: `trip-${field}`,
      name: field,
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
    };
  }
  function fieldError(field: string) {
    return errors[field] ? (
      <p id={`${field}-error`} className="mt-2 text-sm font-medium text-primary">
        {errors[field]}
      </p>
    ) : null;
  }

  const selectedTripType = tripTypes.find((tripType) => tripType.value === draft.tripType);

  function updateTextField(field: TextField, value: string): void {
    setHasEdited(true);
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  function selectTripType(value: string): void {
    if (value === draft.tripType) return;
    setHasEdited(true);
    revealActivities.current = true;
    const selectedOption = tripTypes.find((tripType) => tripType.value === value);

    setDraft((currentDraft) => ({
      ...currentDraft,
      tripType: selectedOption?.value ?? "",
      // Activities belong to the selected trip type, so a new type starts fresh.
      activities: [],
    }));
  }

  function toggleActivity(activity: string): void {
    setHasEdited(true);
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

    const currentErrors = stepFields[step].filter((field) => feedback.errors[field]);
    if (currentErrors.length > 0) {
      setTouched((current) => ({ ...current, ...Object.fromEntries(stepFields[step].map((field) => [field, true])) }));
      goToStep(step, currentErrors[0]);
      return;
    }
    if (step !== "style") {
      goToStep(step === "essentials" ? "budget" : "style");
      return;
    }

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
      setSubmitted(true);
      const firstField = Object.keys(feedback.errors)[0];
      const invalidStep = steps.find((item) => stepFields[item].includes(firstField)) ?? "essentials";
      goToStep(invalidStep, firstField);
      return;
    }

    const query = serializeDatedTripRequest(result.data);
    window.history.replaceState(window.history.state, "", `/planner?${query}`);
    router.push(`/results?${query}`);
  }

  const inputClass =
    "mt-2 min-h-12 w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-2 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  const tripIcons = {
    baecation: Heart,
    "city-break": Building2,
    "beach-holiday": Sun,
    adventure: Mountain,
    foodie: Utensils,
    nightlife: Music,
    relaxing: Leaf,
    culture: Landmark,
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-6 pt-28 pb-16 text-text sm:pt-32">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Your next chapter</p>
      <h1 className="mt-3 max-w-2xl font-serif text-4xl tracking-tight sm:text-5xl">Let’s make your next escape happen.</h1>
      <p className="mt-4 text-muted">Your people, your dates, your kind of holiday.</p>
      {invalidLink && (
        <p role="alert" className="mt-5 rounded-xl border border-border p-4">
          This dated request link is invalid or has expired. Please enter a new request.
        </p>
      )}
      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-12">
        <div className="hidden self-start lg:sticky lg:top-28 lg:block">
          <DatedTripSummary draft={draft} guided />
        </div>
        <form
          aria-label="Plan your holiday"
          onSubmit={submit}
          onBlur={(event) => {
            const field = event.target.getAttribute("name");
            if (field) setTouched((current) => ({ ...current, [field]: true }));
          }}
          noValidate
          className="min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-6 xl:p-8"
        >
          <nav aria-label="Holiday planning steps" className="mb-7 grid grid-cols-3 gap-2">
            {steps.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-current={step === item ? "step" : undefined}
                onClick={() => goToStep(item)}
                className={`min-h-12 cursor-pointer border-b-2 px-1 py-3 text-left text-xs sm:text-sm ${step === item ? "border-primary text-primary" : "border-border text-muted hover:text-text"}`}
              >
                {String(index + 1).padStart(2, "0")} · {item === "essentials" ? "Essentials" : item === "budget" ? "Budget" : "Your style"}
              </button>
            ))}
          </nav>
          <p className="text-xs tracking-widest text-muted uppercase">Step {steps.indexOf(step) + 1} of 3</p>
          <h2 ref={formHeading} tabIndex={-1} className="mt-2 mb-6 font-serif text-3xl tracking-tight">
            {step === "essentials" ? "The who & when" : step === "budget" ? "Make room for the good stuff" : "Your kind of getaway"}
          </h2>
          <section hidden={step !== "essentials"} id="essentials" aria-labelledby="essentials-heading" className="scroll-mt-28 pb-7">
            <h3 id="essentials-heading" className="sr-only">
              The who & when
            </h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label>
                  Departure airport
                  <select
                    {...fieldProps("departureAirportCode")}
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
                {fieldError("departureAirportCode")}
              </div>
              <div>
                <label>
                  Adults
                  <input
                    type="number"
                    min="1"
                    max="9"
                    step="1"
                    {...fieldProps("adultCount")}
                    required
                    className={inputClass}
                    value={draft.adultCount}
                    onChange={(event) => updateTextField("adultCount", event.target.value)}
                  />
                </label>
                {fieldError("adultCount")}
              </div>
              <div>
                <label>
                  Outbound date
                  <input
                    type="date"
                    {...fieldProps("outboundDate")}
                    required
                    className={inputClass}
                    value={draft.outboundDate}
                    onChange={(event) => updateTextField("outboundDate", event.target.value)}
                  />
                </label>
                {fieldError("outboundDate")}
              </div>
              <div>
                <label>
                  Return date
                  <input
                    type="date"
                    {...fieldProps("returnDate")}
                    required
                    className={inputClass}
                    value={draft.returnDate}
                    onChange={(event) => updateTextField("returnDate", event.target.value)}
                  />
                </label>
                {fieldError("returnDate")}
              </div>
            </div>
            {feedback.nights !== undefined && (
              <p aria-live="polite" className="mt-4 text-sm font-medium text-primary">
                {feedback.nights} {feedback.nights === 1 ? "night" : "nights"} · {feedback.nights + 1} spending days
              </p>
            )}
            <p className="mt-4 text-sm text-muted">1–9 adults · Economy · 1–28 nights. Depart within the next 365 days.</p>
          </section>
          <section hidden={step !== "budget"} id="budget" aria-labelledby="budget-heading" className="scroll-mt-28 pb-7">
            <h3 id="budget-heading" className="sr-only">
              Make room for the good stuff
            </h3>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <label>
                  Group holiday budget (GBP)
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    {...fieldProps("budget")}
                    required
                    className={inputClass}
                    value={draft.budget}
                    onChange={(event) => updateTextField("budget", event.target.value)}
                  />
                </label>
                {fieldError("budget")}
              </div>
              <div>
                <label>
                  Daily spending allowance per adult (GBP)
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="0.01"
                    {...fieldProps("allowance")}
                    required
                    className={inputClass}
                    value={draft.allowance}
                    onChange={(event) => updateTextField("allowance", event.target.value)}
                  />
                </label>
                {fieldError("allowance")}
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Your total includes flights, a place to stay and everyday spending. The daily allowance covers each adult, including both travel days.
              Zero is allowed.
            </p>
            {feedback.remaining !== undefined && feedback.remaining <= 0 && (
              <div role="status" className="mt-4 rounded-xl bg-secondary p-4 text-sm leading-relaxed">
                <p>
                  {feedback.remaining === 0
                    ? "Your daily spending leaves £0 for flights and accommodation."
                    : `Your daily spending exceeds the group budget by ${formatTripMoney(-feedback.remaining)}.`}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-5">
                  <a
                    className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                    href="#trip-budget"
                    onClick={(event) => {
                      event.preventDefault();
                      goToStep("budget", "budget");
                    }}
                  >
                    Adjust group budget
                  </a>
                  <a
                    className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                    href="#trip-allowance"
                    onClick={(event) => {
                      event.preventDefault();
                      goToStep("budget", "allowance");
                    }}
                  >
                    Adjust daily spending
                  </a>
                </div>
              </div>
            )}
          </section>
          <section hidden={step !== "style"} id="style" aria-labelledby="style-heading" className="scroll-mt-28 pb-7">
            <h3 id="style-heading" className="sr-only">
              What’s your kind of getaway?
            </h3>
            <div
              id="trip-tripType"
              role="group"
              aria-label="Trip type"
              aria-describedby={errors.tripType ? "tripType-error" : undefined}
              className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2"
            >
              {tripTypes.map(({ value, label, description }) => {
                const Icon = tripIcons[value];
                const selected = draft.tripType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectTripType(value)}
                    title={description}
                    className={`flex min-h-20 cursor-pointer items-center justify-start gap-3 rounded-xl border px-2 py-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selected ? "border-primary bg-secondary text-text" : "border-border bg-surface text-text hover:border-primary"}`}
                  >
                    <Icon aria-hidden="true" className="size-5 text-primary" />
                    {label}
                  </button>
                );
              })}
            </div>
            {fieldError("tripType")}
            <div
              id="trip-activities"
              ref={activitiesRef}
              className="mt-7 scroll-mt-28"
              role="group"
              aria-label="Holiday activities"
              aria-describedby={errors.activities ? "activities-error" : undefined}
            >
              <ActivitiesStep
                title="What would make this trip?"
                description="Choose at least one. Pick the experiences you’d most like to build your holiday around."
                availableActivities={selectedTripType?.activities ?? []}
                selectedActivities={draft.activities}
                onToggle={toggleActivity}
              />
              {fieldError("activities")}
            </div>
          </section>
          {((submitted && Object.keys(errors).length > 0) || stepFields[step].some((field) => touched[field] && errors[field])) && (
            <div role="alert" className="rounded-xl border border-primary/40 p-4">
              <p className="font-semibold">Please check your request</p>
              <ul className="mt-2 list-disc pl-5">
                {Object.entries(errors)
                  .filter(([field]) => submitted || stepFields[step].includes(field))
                  .map(([field, message]) => (
                    <li key={field}>
                      <a
                        className="underline underline-offset-4"
                        href={`#trip-${field}`}
                        onClick={(event) => {
                          event.preventDefault();
                          goToStep(steps.find((item) => stepFields[item].includes(field)) ?? "essentials", field);
                        }}
                      >
                        {errorLabels[field] ?? "Activities"}: {message}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <details className="mb-6 rounded-xl border border-border bg-secondary lg:hidden">
            <summary className="cursor-pointer p-4 text-sm font-medium">
              <span>Your trip at a glance</span>
              <span className="mt-1 block text-muted">
                {feedback.nights !== undefined ? `${feedback.nights} nights` : "Dates to decide"} ·{" "}
                {feedback.budget !== undefined ? formatTripMoney(feedback.budget) : "Budget to decide"}
                <span className="mt-1 block text-xs">Expand for dates and budget breakdown</span>
              </span>
            </summary>
            <DatedTripSummary draft={draft} />
          </details>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-5 border-t border-border pt-6">
            <div>
              {step !== "essentials" && (
                <button
                  type="button"
                  onClick={() => goToStep(step === "style" ? "budget" : "essentials")}
                  className="min-h-11 cursor-pointer text-sm text-primary underline underline-offset-4"
                >
                  Back
                </button>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted">
                France · Spain · Portugal
                <br />
                Italy · Greece · Malta
              </p>
            </div>
            <button
              type="submit"
              className="inline-flex min-h-12 cursor-pointer items-center gap-4 rounded-xl bg-primary px-5 py-3 text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {step === "style" ? "Review trip request" : "Continue"}
              <ArrowRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <Link href="/planner" className="mt-6 inline-flex min-h-11 items-center text-sm text-muted underline underline-offset-4">
            Use the month-based planner
          </Link>
        </form>
      </div>
    </div>
  );
}
