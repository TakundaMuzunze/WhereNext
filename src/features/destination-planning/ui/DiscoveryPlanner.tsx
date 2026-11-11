"use client";

import { poundsToPence } from "@/features/trip-planner/lib/datedPlannerSearchParams";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { serializeDiscoveryRequest } from "../lib/discoveryRequest";
import { discoveryRequestSchema, nightsBetween, type DiscoveryRequest } from "../model/discoveryRequest";
import { DiscoveryInterests } from "./DiscoveryInterests";
import { DiscoveryPlannerSummary } from "./DiscoveryPlannerSummary";
import { ArrowRight } from "lucide-react";

const steps = ["Your kind of trip", "When & who", "Your budget"];
const stepFields = [["activities"], ["timing", "approximateNights", "adultCount"], ["groupBudgetPence"]];
const stepErrors = [
  "Choose 1–10 interests to start discovering.",
  "Choose a valid month or dates, 1–28 nights and 1–9 adults. Exact dates must be 1–28 nights apart.",
  "Enter a total group budget from £1 to £100,000, with up to two decimal places.",
];

const inputClassName = "mt-2 block min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-text";

type DiscoveryPlannerProps = {
  initialRequest?: DiscoveryRequest;
  invalidLink?: boolean;
};

export function DiscoveryPlanner({ initialRequest, invalidLink = false }: DiscoveryPlannerProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
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

    if (activities.length < 10) {
      setActivities([...activities, interest]);
    }
  }

  const draft = { timing, month, outboundDate, returnDate, nights, adults, budget, activities };

  function validateDraft() {
    return discoveryRequestSchema.safeParse({
      kind: "discovery",
      timing: timing === "exact" ? { kind: timing, outboundDate, returnDate } : timing === "month" ? { kind: timing, month } : { kind: timing },
      approximateNights: timing === "exact" ? nightsBetween(outboundDate, returnDate) : Number(nights),
      adultCount: Number(adults),
      groupBudgetPence: poundsToPence(budget),
      activities,
    });
  }

  function goToStep(next: number, error: string | null = null) {
    setStep(next);
    setErrorMessage(error);
    requestAnimationFrame(() => (error ? errorRef.current : headingRef.current)?.focus());
  }

  function changeStep(next: number) {
    if (next > step) {
      const validation = validateDraft();
      if (!validation.success && validation.error.issues.some((issue) => stepFields[step].includes(String(issue.path[0])))) {
        goToStep(step, stepErrors[step]);
        return;
      }
    }
    goToStep(next);
  }

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 2) {
      changeStep(step + 1);
      return;
    }
    const validation = validateDraft();
    if (!validation.success) {
      const invalidStep = stepFields.findIndex((fields) => validation.error.issues.some((issue) => fields.includes(String(issue.path[0]))));
      goToStep(invalidStep < 0 ? 0 : invalidStep, stepErrors[invalidStep < 0 ? 0 : invalidStep]);
      return;
    }
    router.push(`/results?${serializeDiscoveryRequest(validation.data)}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pt-28 pb-20 text-text sm:px-8">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Your next chapter</p>
      <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
        Somewhere that feels
        <br className="hidden sm:block" /> like your kind of escape.
      </h1>
      <p className="mt-4 leading-7 text-muted">Start with what you love. We’ll help you find where to go.</p>
      <ol aria-label="Your discovery journey" className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted">
        <li className="font-medium text-text">01 · Your trip</li>
        <li aria-hidden="true">
          <ArrowRight className="size-3" />
        </li>
        <li>02 · Discover places</li>
        <li aria-hidden="true">
          <ArrowRight className="size-3" />
        </li>
        <li>03 · Explore &amp; plan</li>
      </ol>
      {invalidLink && (
        <p role="alert" className="mt-6">
          This request link is invalid. Please enter your trip details again.
        </p>
      )}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
        <div className="order-2 min-w-0 lg:sticky lg:top-28 lg:order-1">
          <div className="hidden lg:block">
            <DiscoveryPlannerSummary draft={draft} />
          </div>
          <details className="rounded-2xl border border-border p-4 lg:hidden">
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-primary">Your trip taking shape · {activities.length} interests</summary>
            <div className="mt-4">
              <DiscoveryPlannerSummary draft={draft} />
            </div>
          </details>
        </div>
        <form
          noValidate
          onSubmit={submitRequest}
          aria-label="Plan your discovery"
          className="order-1 min-w-0 rounded-2xl border border-border bg-surface p-5 sm:p-8 lg:order-2"
        >
          <nav aria-label="Discovery planning steps" className="flex gap-3">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                aria-current={step === index ? "step" : undefined}
                onClick={() => changeStep(index)}
                className={`min-h-11 min-w-0 flex-1 cursor-pointer border-b-2 pb-3 text-left text-xs leading-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${step === index ? "border-primary text-primary" : "border-border text-muted hover:text-text"}`}
              >
                <span className="mr-1">0{index + 1} ·</span> {label}
              </button>
            ))}
          </nav>
          <p className="mt-7 text-xs tracking-[0.12em] text-primary uppercase">Step {step + 1} of 3</p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-3 scroll-mt-28 font-serif text-3xl leading-tight outline-none">
            {["What makes a good trip?", "A little shape to your escape.", "What feels comfortable?"][step]}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {
              [
                "Mix a few interests. There’s no need to fit one holiday type.",
                "A month, exact dates, or room to be spontaneous.",
                "One budget for everyone, from leaving home to coming back.",
              ][step]
            }
          </p>
          <div hidden={step !== 0} className="mt-6">
            <DiscoveryInterests selectedInterests={activities} onToggle={toggleInterest} />
          </div>
          <fieldset hidden={step !== 1} className="mt-6">
            <legend className="sr-only">When and who?</legend>
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
            <div className="mt-5 max-w-sm">
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
            </div>
            <p className="mt-5 text-xs leading-6 text-muted">No departure airport needed yet. Start by finding somewhere you’d love to go.</p>
          </fieldset>
          <fieldset hidden={step !== 2} className="mt-6">
            <legend className="sr-only">Your budget</legend>
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

            <p className="mt-5 rounded-xl bg-secondary p-4 text-sm leading-6 text-muted">
              Your budget travels with your trip. It covers travel, accommodation and spending for everyone. We’ll check travel costs once you’ve
              found a place you like. Discovery doesn’t establish affordability yet.
            </p>
          </fieldset>

          {errorMessage && (
            <p ref={errorRef} role="alert" tabIndex={-1} className="mt-5 rounded-xl border border-border p-4 text-sm outline-none">
              {errorMessage}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
            <p className="text-xs text-muted">{step === 0 ? `${activities.length} interests selected` : "You can change this later."}</p>
            <div className="flex items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={() => goToStep(step - 1)} className="min-h-11 cursor-pointer px-3 text-sm text-primary">
                  Back
                </button>
              )}
              <button
                type="submit"
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {step < 2 ? "Continue" : "Discover places"}
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
      <p className="mt-8 text-sm text-muted">
        Ready to check travel options?{" "}
        <Link href="/planner?kind=dated" className="inline-flex min-h-11 cursor-pointer items-center text-primary underline">
          Plan with an airport and dates
        </Link>
      </p>
    </main>
  );
}
