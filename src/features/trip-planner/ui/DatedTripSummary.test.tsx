import { render, screen, within } from "@testing-library/react";
import { DatedTripSummary } from "./DatedTripSummary";
import type { DatedTripDraft } from "../lib/datedTripDraft";

const draft: DatedTripDraft = {
  departureAirportCode: "LHR",
  outboundDate: "2027-03-27",
  returnDate: "2027-03-29",
  adultCount: "2",
  budget: "1000",
  allowance: "40.25",
  tripType: "beach-holiday",
  activities: ["Beaches"],
};

it("reserves spending for both travel days across a daylight-saving change", () => {
  render(<DatedTripSummary draft={draft} />);
  const summary = within(screen.getByRole("complementary"));
  expect(summary.getByText("2 nights")).toBeInTheDocument();
  expect(summary.getByText("£241.50")).toBeInTheDocument();
  expect(summary.getByText("£758.50")).toBeInTheDocument();
});

it("does not manufacture totals from empty or invalid unfinished inputs", () => {
  render(<DatedTripSummary draft={{ ...draft, returnDate: "", adultCount: "2.5", budget: "", allowance: "" }} />);
  expect(screen.getByText("Your call")).toBeInTheDocument();
  expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  expect(screen.getAllByText("—")).toHaveLength(2);
});

it("allows zero spending and warns when the allowance exceeds the budget", () => {
  const { rerender } = render(<DatedTripSummary draft={{ ...draft, allowance: "0" }} />);
  expect(screen.getByText("£0")).toBeInTheDocument();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  rerender(<DatedTripSummary draft={{ ...draft, budget: "200" }} />);
  expect(screen.getByRole("status")).toHaveTextContent("exceeds the group budget");
  expect(screen.getByText("£41.50")).toBeInTheDocument();
});
