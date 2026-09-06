"use client";
import type { PlannerAnswers, TripType } from "@/entities/trip/model/types";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState } from "react";
import { PlannerProgress } from "./PlannerProgress";
import { tripTypes } from "@/shared/data/TripTypes";
import { canContinueFromStep, getNextStep, getPreviousStep, plannerSteps, totalPlannerSteps, type PlannerStep } from "../model/plannerFlow";
import { serializePlannerAnswers } from "../lib/plannerSearchParams";
import { ActivitiesStep } from "./steps/ActivitiesStep";
import { TripDetailsStep } from "./steps/TripDetailsStep";
import { TripTypeStep } from "./steps/TripTypeStep";

const defaultAnswers: PlannerAnswers = {
  departure: "",
  travelMonth: "",
  duration: "",
  budget: "",
  travellers: 2,
  tripType: "",
  activities: [],
};

type TripPlannerFormProps = {
  initialAnswers?: PlannerAnswers;
};

export function TripPlannerForm({ initialAnswers = defaultAnswers }: TripPlannerFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<PlannerStep>(plannerSteps.tripDetails);
  const [answers, setAnswers] = useState<PlannerAnswers>(initialAnswers);

  const canContinue = canContinueFromStep(step, answers);

  const selectedTripType = tripTypes.find((tripType) => tripType.value === answers.tripType);

  function selectTripType(tripType: TripType): void {
    setAnswers((currentAnswers) => {
      if (currentAnswers.tripType === tripType) {
        return currentAnswers;
      }

      return {
        ...currentAnswers,
        tripType,
        activities: [],
      };
    });
  }

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

  function goNext(): void {
    setStep(getNextStep);
  }

  function goBack(): void {
    setStep(getPreviousStep);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!canContinue) return;

    if (step === plannerSteps.activities) {
      router.push(`/results?${serializePlannerAnswers(answers)}`);
      return;
    }

    goNext();
  }

  return (
    <form aria-labelledby="planner-heading" onSubmit={handleSubmit} className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-24">
      <div className="w-full rounded-3xl border border-primary/20 bg-background p-6 shadow-sm md:p-8">
        <div className="mb-8">
          <div className="flex w-full flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="shrink-0 text-sm tracking-widest text-text/60 uppercase">
              Step {step} of {totalPlannerSteps}
            </p>

            <PlannerProgress currentStep={step} totalSteps={totalPlannerSteps} />
          </div>

          <h1 id="planner-heading" className="mt-3 text-3xl font-bold text-text">
            Plan your next trip
          </h1>

          <p className="mt-3 text-text/75">Answer a few questions and WhereNext will build your destination shortlist.</p>
        </div>

        {step === plannerSteps.tripDetails && <TripDetailsStep answers={answers} onUpdate={updateAnswer} />}

        {step === plannerSteps.tripType && <TripTypeStep selectedTripType={answers.tripType} onSelect={selectTripType} />}

        {step === plannerSteps.activities && (
          <ActivitiesStep
            availableActivities={selectedTripType?.activities ?? []}
            selectedActivities={answers.activities}
            onToggle={toggleActivity}
          />
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === plannerSteps.tripDetails}
            className="cursor-pointer rounded-xl border border-primary/20 px-5 py-3 text-text transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>

          {step !== plannerSteps.activities ? (
            <button
              type="submit"
              disabled={!canContinue}
              className="cursor-pointer rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#101214]"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canContinue}
              className="cursor-pointer rounded-xl bg-primary px-5 py-3 text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#101214]"
            >
              See matches
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
