import type { PlannerAnswers } from "@/entities/trip/model/types";

export const plannerSteps = {
  tripDetails: 1,
  tripType: 2,
  activities: 3,
} as const;

export type PlannerStep = (typeof plannerSteps)[keyof typeof plannerSteps];

export const totalPlannerSteps = Object.keys(plannerSteps).length;

export function canContinueFromStep(step: PlannerStep, answers: PlannerAnswers): boolean {
  switch (step) {
    case plannerSteps.tripDetails:
      return Boolean(
        answers.departure.trim() &&
        answers.travelMonth.trim() &&
        answers.duration !== "" &&
        answers.duration > 0 &&
        answers.budget !== "" &&
        answers.budget > 0 &&
        answers.travellers !== "" &&
        answers.travellers > 0,
      );
    case plannerSteps.tripType:
      return answers.tripType !== "";
    case plannerSteps.activities:
      return answers.activities.length > 0;
  }
}

export function getNextStep(step: PlannerStep): PlannerStep {
  if (step === plannerSteps.tripDetails) return plannerSteps.tripType;
  return plannerSteps.activities;
}

export function getPreviousStep(step: PlannerStep): PlannerStep {
  if (step === plannerSteps.activities) return plannerSteps.tripType;
  return plannerSteps.tripDetails;
}
