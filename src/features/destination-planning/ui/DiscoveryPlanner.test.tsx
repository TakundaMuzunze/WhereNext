import { fireEvent, render, screen } from "@testing-library/react";
import { DiscoveryPlanner } from "./DiscoveryPlanner";
import { parseDiscoveryRequest } from "../lib/discoveryRequest";
import type { DiscoveryRequest } from "../model/discoveryRequest";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const initialRequest: DiscoveryRequest = {
  kind: "discovery",
  timing: { kind: "month", month: "2027-07" },
  approximateNights: 7,
  adultCount: 2,
  groupBudgetPence: 200050,
  activities: ["Museums", "Beaches"],
};
const continueStep = () => fireEvent.click(screen.getByRole("button", { name: "Continue" }));
beforeEach(() => push.mockClear());

it("starts with interests and validates before advancing", () => {
  render(<DiscoveryPlanner />);
  expect(screen.getByRole("heading", { name: "What makes a good trip?" })).toBeVisible();
  expect(screen.getByLabelText("Timing")).not.toBeVisible();
  continueStep();
  expect(screen.getByRole("alert")).toHaveTextContent("Choose 1–10 interests");
  fireEvent.click(screen.getByRole("checkbox", { name: "Museums" }));
  continueStep();
  expect(screen.getByLabelText("Timing")).toBeVisible();
  expect(push).not.toHaveBeenCalled();
});

it("edits timing and party size while preserving earlier budget context without asking for it", () => {
  render(<DiscoveryPlanner initialRequest={initialRequest} />);
  continueStep();
  expect(screen.getByLabelText("Preferred month")).toHaveValue("2027-07");
  fireEvent.change(screen.getByLabelText("Adults", { exact: true }), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  continueStep();
  expect(screen.getByLabelText("Adults", { exact: true })).toHaveValue(3);
  expect(screen.queryByLabelText("Group budget (GBP)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  const url = new URL(push.mock.calls[0][0], "https://example.test");
  expect(parseDiscoveryRequest({ ...Object.fromEntries(url.searchParams), activity: url.searchParams.getAll("activity") })).toEqual({
    ...initialRequest,
    adultCount: 3,
  });
});

it("blocks invalid dates and derives exact nights across a year boundary", () => {
  render(<DiscoveryPlanner initialRequest={initialRequest} />);
  continueStep();
  fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "exact" } });
  fireEvent.change(screen.getByLabelText("Departure date"), { target: { value: "2027-12-28" } });
  fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2027-12-27" } });
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Exact dates must be 1–28 nights apart");
  expect(push).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2028-01-04" } });
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(push).toHaveBeenCalledWith(expect.stringContaining("nights=7"));
});

it("keeps legacy unsupported interests removable and explains why they are not assessed", () => {
  render(<DiscoveryPlanner initialRequest={{ ...initialRequest, activities: ["Shopping"] }} />);
  expect(screen.queryByRole("checkbox", { name: "Shopping" })).not.toBeInTheDocument();
  expect(screen.getByText(/saved request includes interests we cannot assess/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Remove Shopping" }));
  continueStep();
  expect(screen.getByRole("alert")).toHaveTextContent("Choose 1–10 interests");
});

it("submits a new request without a budget or airport", () => {
  render(<DiscoveryPlanner />);
  fireEvent.click(screen.getByRole("checkbox", { name: "Museums" }));
  continueStep();
  expect(screen.queryByLabelText("Departure airport")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Group budget (GBP)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  const url = new URL(push.mock.calls[0][0], "https://example.test");
  expect(url.searchParams.has("budget")).toBe(false);
  expect(url.searchParams.has("departureAirportCode")).toBe(false);
});

it("preserves earlier airport context while discovery no longer collects an airport", () => {
  render(<DiscoveryPlanner initialRequest={{ ...initialRequest, departureAirportCode: "MAN" }} />);
  continueStep();
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(push).toHaveBeenCalledWith(expect.stringContaining("departureAirportCode=MAN"));
});
