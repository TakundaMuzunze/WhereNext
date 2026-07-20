"use client";
import type { PlannerAnswers, TripType } from "@/entities/trip/model/types";
import { tripTypes } from "@/shared/data/TripTypes";
import { useState } from "react";
import { PlannerProgress } from "./PlannerProgress";

const initialAnswers: PlannerAnswers = {
  departure: "",
  travelMonth: "",
  duration: "",
  budget: "",
  travellers: 2,
  tripType: "",
  activities: [],
};

export function TripPlannerForm() {
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<PlannerAnswers>(initialAnswers);

  const selectedTripType = tripTypes.find((tripType) => tripType.value === answers.tripType);

  function updateAnswer<Field extends keyof PlannerAnswers>(field: Field, value: PlannerAnswers[Field]) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [field]: value,
    }));
  }

  function toggleActivity(activity: string): void {
    setAnswers((currentAnswers) => {
      const alreadySelected = currentAnswers.activities.includes(activity);

      return {
        ...currentAnswers,
        activities: alreadySelected ? currentAnswers.activities.filter((item) => item !== activity) : [...currentAnswers.activities, activity],
      };
    });
  }

  function goNext() {
    setStep((currentStep) => Math.min(currentStep + 1, 3));
  }

  function goBack() {
    setStep((currentStep) => Math.max(currentStep - 1, 1));
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-24">
      <div className="w-full rounded-3xl border border-primary/20 bg-background p-6 shadow-sm md:p-8">
        <div className="mb-8">
          <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="shrink-0 text-sm tracking-widest text-text/60 uppercase">Step {step} of 3</p>

            <PlannerProgress currentStep={step} totalSteps={3} />
          </div>

          <h1 className="mt-3 text-3xl font-bold text-text">Plan your next trip</h1>

          <p className="mt-3 text-text/75">Answer a few questions and WhereNext will build your destination shortlist.</p>
        </div>

        {step === 1 && (
          <div className="grid gap-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-text">Where are you travelling from?</label>
              <input
                value={answers.departure}
                onChange={(event) => updateAnswer("departure", event.target.value)}
                placeholder="London"
                className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-text">When do you want to travel?</label>
                <input
                  value={answers.travelMonth}
                  onChange={(event) => updateAnswer("travelMonth", event.target.value)}
                  placeholder="June, September, December..."
                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Duration</label>
                <input
                  value={answers.duration}
                  onChange={(event) => updateAnswer("duration", event.target.value)}
                  placeholder="7 days"
                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Budget</label>
                <input
                  type="number"
                  min="0"
                  value={answers.budget}
                  onChange={(event) => updateAnswer("budget", event.target.value === "" ? "" : event.target.valueAsNumber)}
                  placeholder="800"
                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text">Travellers</label>
                <input
                  type="number"
                  min="1"
                  value={answers.travellers}
                  onChange={(event) => updateAnswer("travellers", event.target.value === "" ? "" : event.target.valueAsNumber)}
                  placeholder="2"
                  className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            {tripTypes.map((tripType) => {
              const isSelected = answers.tripType === tripType.value;

              return (
                <button
                  key={tripType.value}
                  type="button"
                  onClick={() => updateAnswer("tripType", tripType.value as TripType)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary text-white dark:text-[#101214]"
                      : "border-primary/20 bg-background text-text hover:border-primary"
                  }`}
                >
                  <h2 className="text-lg font-semibold">{tripType.label}</h2>
                  <p className={`mt-2 text-sm ${isSelected ? "opacity-80" : "text-text/70"}`}>{tripType.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-text">What do you want to do?</h2>

            <p className="mt-2 text-text/70">Choose the activities that matter most for this trip.</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {selectedTripType?.activities.map((activity) => {
                const isSelected = answers.activities.includes(activity);

                return (
                  <button
                    key={activity}
                    type="button"
                    onClick={() => toggleActivity(activity)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      isSelected ? "border-primary bg-primary text-white dark:text-[#101214]" : "border-primary/20 text-text hover:border-primary"
                    }`}
                  >
                    {activity}
                  </button>
                );
              })}
            </div>

            {!selectedTripType && <p className="mt-6 rounded-xl bg-secondary p-4 text-text">Go back and choose a trip type first.</p>}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="rounded-xl border border-primary/20 px-5 py-3 text-text transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90 dark:text-[#101214]"
            >
              Continue
            </button>
          ) : (
            <button type="button" className="rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90 dark:text-[#101214]">
              See matches
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
