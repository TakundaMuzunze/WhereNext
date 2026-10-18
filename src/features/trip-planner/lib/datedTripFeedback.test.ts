import { getDatedTripFeedback } from "./datedTripFeedback";
import type { DatedTripDraft } from "./datedTripDraft";

const draft: DatedTripDraft = {
  departureAirportCode: "",
  outboundDate: "2027-03-27",
  returnDate: "2027-03-29",
  adultCount: "2",
  budget: "241.50",
  allowance: "40.25",
  tripType: "",
  activities: [],
};
const today = "2027-03-01";

it("asks for an activity after choosing a holiday style, then clears the guidance when one is selected", () => {
  const selectedStyle: DatedTripDraft = { ...draft, departureAirportCode: "MAN", tripType: "city-break", activities: [] };
  const unfinished = getDatedTripFeedback(selectedStyle, today);
  expect(unfinished.errors.tripType).toBeUndefined();
  expect(unfinished.errors.activities).toBe("Choose at least one activity for this holiday style.");

  const completed = getDatedTripFeedback({ ...selectedStyle, activities: ["Museums"] }, today);
  expect(completed.errors).toEqual({});
  expect(completed.remaining).toBe(0);
});

it("validates date relationships while the airport and style are still unanswered", () => {
  const feedback = getDatedTripFeedback({ ...draft, returnDate: "2027-03-26" }, today);
  expect(feedback.errors.returnDate).toContain("between 1 and 28 nights");
  expect(feedback.spending).toBeUndefined();
});

it("checks the departure window even before the return date is supplied", () => {
  expect(getDatedTripFeedback({ ...draft, outboundDate: "2027-02-28", returnDate: "" }, today).errors.outboundDate).toContain("next 365 days");
});

it("calculates an exact zero balance including both travel days across DST", () => {
  const feedback = getDatedTripFeedback(draft, today);
  expect(feedback.nights).toBe(2);
  expect(feedback.spending).toBe(24150);
  expect(feedback.remaining).toBe(0);
});

it("withholds calculations for malformed money, fractional adults and invalid dates", () => {
  for (const change of [{ allowance: "1.234" }, { adultCount: "2.5" }, { returnDate: "2027-02-30" }]) {
    const feedback = getDatedTripFeedback({ ...draft, ...change }, today);
    expect(feedback.remaining).toBeUndefined();
    expect(feedback.spending).toBeUndefined();
  }
});

it("clears an error after correction and supports zero daily spending", () => {
  expect(getDatedTripFeedback({ ...draft, allowance: "1001" }, today).errors.allowance).toBeDefined();
  const feedback = getDatedTripFeedback({ ...draft, allowance: "0" }, today);
  expect(feedback.errors.allowance).toBeUndefined();
  expect(feedback.spending).toBe(0);
  expect(feedback.remaining).toBe(24150);
});
