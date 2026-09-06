import type { PlannerAnswers } from "@/entities/trip/model/types";
import { canContinueFromStep, getNextStep, getPreviousStep, plannerSteps, totalPlannerSteps } from "./plannerFlow";

const completeAnswers: PlannerAnswers = {
  departure: "London",
  travelMonth: "June",
  duration: 5,
  budget: 1500,
  travellers: 2,
  tripType: "city-break",
  activities: ["Museums"],
};

describe("planner flow", () => {
  expect(totalPlannerSteps).toBe(3);

  it("validates each step", () => {
    expect(canContinueFromStep(plannerSteps.tripDetails, completeAnswers)).toBe(true);
    expect(canContinueFromStep(plannerSteps.tripType, completeAnswers)).toBe(true);
    expect(canContinueFromStep(plannerSteps.activities, completeAnswers)).toBe(true);
  });

  it.each([
    { departure: " " },
    { travelMonth: " " },
    { duration: "" },
    { duration: 0 },
    { budget: "" },
    { budget: 0 },
    { travellers: "" },
    { travellers: 0 },
  ] satisfies Partial<PlannerAnswers>[])("rejects invalid trip details: $departure$travelMonth$duration$budget$travellers", (change) => {
    expect(canContinueFromStep(plannerSteps.tripDetails, { ...completeAnswers, ...change })).toBe(false);
  });

  it("rejects missing trip choices", () => {
    expect(canContinueFromStep(plannerSteps.tripType, { ...completeAnswers, tripType: "" })).toBe(false);
    expect(canContinueFromStep(plannerSteps.activities, { ...completeAnswers, activities: [] })).toBe(false);
  });

  it("keeps navigation within the planner", () => {
    expect(getNextStep(plannerSteps.tripDetails)).toBe(plannerSteps.tripType);
    expect(getNextStep(plannerSteps.tripType)).toBe(plannerSteps.activities);
    expect(getNextStep(plannerSteps.activities)).toBe(plannerSteps.activities);
    expect(getPreviousStep(plannerSteps.activities)).toBe(plannerSteps.tripType);
    expect(getPreviousStep(plannerSteps.tripType)).toBe(plannerSteps.tripDetails);
    expect(getPreviousStep(plannerSteps.tripDetails)).toBe(plannerSteps.tripDetails);
  });
});
