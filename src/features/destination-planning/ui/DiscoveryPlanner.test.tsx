import { fireEvent, render, screen, within } from "@testing-library/react";
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
const selectStep = (name: string) =>
  fireEvent.click(within(screen.getByRole("navigation", { name: "Discovery planning steps" })).getByRole("button", { name: new RegExp(name) }));
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

it("preserves an edited trip across steps and submits the original discovery contract", () => {
  render(<DiscoveryPlanner initialRequest={initialRequest} />);
  expect(screen.getByRole("button", { name: "Remove Beaches" })).toBeVisible();
  continueStep();
  expect(screen.getByLabelText("Preferred month")).toHaveValue("2027-07");
  fireEvent.change(screen.getByLabelText("Adults", { exact: true }), { target: { value: "3" } });
  continueStep();
  expect(screen.getByLabelText("Group budget (GBP)")).toHaveValue(2000.5);
  fireEvent.click(screen.getByRole("button", { name: "Back" }));
  expect(screen.getByLabelText("Adults", { exact: true })).toHaveValue(3);
  continueStep();
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  const url = new URL(push.mock.calls[0][0], "https://example.test");
  const query = Object.fromEntries(url.searchParams);
  expect(parseDiscoveryRequest({ ...query, activity: url.searchParams.getAll("activity") })).toEqual({ ...initialRequest, adultCount: 3 });
});

it("blocks invalid timing, derives exact nights, and carries values into the live summary", () => {
  render(<DiscoveryPlanner initialRequest={initialRequest} />);
  continueStep();
  fireEvent.change(screen.getByLabelText("Timing"), { target: { value: "exact" } });
  fireEvent.change(screen.getByLabelText("Departure date"), { target: { value: "2027-12-28" } });
  fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2027-12-27" } });
  continueStep();
  expect(screen.getByRole("alert")).toHaveTextContent("Exact dates must be 1–28 nights apart");
  expect(push).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2028-01-04" } });
  continueStep();
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(push).toHaveBeenCalledWith(expect.stringContaining("nights=7"));
  expect(push).toHaveBeenCalledWith(expect.stringContaining("return=2028-01-04"));
});

it("validates budget and prevents advancing after all interests are removed", () => {
  render(<DiscoveryPlanner initialRequest={initialRequest} />);
  selectStep("Your budget");
  fireEvent.change(screen.getByLabelText("Group budget (GBP)"), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(screen.getByRole("alert")).toHaveTextContent("£1 to £100,000");
  fireEvent.change(screen.getByLabelText("Group budget (GBP)"), { target: { value: "2000.50" } });
  selectStep("Your kind of trip");
  fireEvent.click(screen.getByRole("button", { name: "Remove Museums" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove Beaches" }));
  // Returning to interests must prevent advancing with an empty selection.
  fireEvent.submit(screen.getByRole("form", { name: "Plan your discovery" }));
  expect(push).not.toHaveBeenCalled();
});

it("keeps flexible discovery independent of airports and preserves invalid-link feedback", () => {
  render(<DiscoveryPlanner initialRequest={{ ...initialRequest, timing: { kind: "flexible" } }} invalidLink />);
  expect(screen.getByRole("alert")).toHaveTextContent("request link is invalid");
  continueStep();
  expect(screen.queryByLabelText("Preferred month")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Departure airport")).not.toBeInTheDocument();
  continueStep();
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(push).toHaveBeenCalledWith(expect.stringContaining("timing=flexible"));
});

it("returns final submission to an invalid earlier step instead of losing its values", () => {
  render(<DiscoveryPlanner initialRequest={initialRequest} />);
  continueStep();
  fireEvent.change(screen.getByLabelText("Preferred month"), { target: { value: "" } });
  selectStep("Your kind of trip");
  selectStep("Your budget");
  fireEvent.click(screen.getByRole("button", { name: "Discover places" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Choose a valid month or dates");
  expect(screen.getByLabelText("Preferred month")).toBeVisible();
  expect(screen.getByLabelText("Preferred month")).toHaveValue("");
  expect(push).not.toHaveBeenCalled();
});
