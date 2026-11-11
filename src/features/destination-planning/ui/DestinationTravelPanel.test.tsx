import { fireEvent, render, screen } from "@testing-library/react";
import { DestinationTravelPanel } from "./DestinationTravelPanel";
import type { DiscoveryRequest } from "../model/discoveryRequest";
import { parseDiscoveryRequest } from "../lib/discoveryRequest";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/destinations/wikidata%3AQ159457",
}));
jest.mock("@/features/trip-planner/lib/datedPlannerSearchParams", () => ({
  ...jest.requireActual("@/features/trip-planner/lib/datedPlannerSearchParams"),
  londonToday: () => "2026-11-11",
}));

const request: DiscoveryRequest = {
  kind: "discovery",
  timing: { kind: "month", month: "2027-07" },
  approximateNights: 7,
  adultCount: 2,
  groupBudgetPence: 200050,
  activities: ["Beaches", "Rooftop drinks"],
  departureAirportCode: "MAN",
};
beforeEach(() => replace.mockClear());
function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save travel details" }));
}
function savedRequest() {
  const url = new URL(replace.mock.calls[0][0], "https://example.test");
  return parseDiscoveryRequest({ ...Object.fromEntries(url.searchParams), activity: url.searchParams.getAll("activity") });
}

it("carries the airport into the destination panel without claiming a verified arrival airport or live service", () => {
  render(<DestinationTravelPanel destinationName="Faro" request={request} />);
  expect(screen.getByLabelText("Departure airport")).toHaveValue("MAN");
  expect(screen.getByText("Arrival airport still to assess")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Check travel options" })).toBeDisabled();
  expect(screen.getByText(/No routes, arrival airports, transfers, prices or availability/)).toBeInTheDocument();
});

it("can change or clear the airport while retaining month timing and all discovery preferences", () => {
  render(<DestinationTravelPanel destinationName="Faro" request={request} />);
  fireEvent.change(screen.getByLabelText("Departure airport"), { target: { value: "LHR" } });
  save();
  expect(savedRequest()).toEqual({ ...request, departureAirportCode: "LHR" });
  fireEvent.change(screen.getByLabelText("Departure airport"), { target: { value: "" } });
  save();
  const url = new URL(replace.mock.calls[1][0], "https://example.test");
  expect(url.searchParams.has("departureAirportCode")).toBe(false);
});

it("saves exact dates on the current destination, deriving nights and keeping budget and interests", () => {
  render(<DestinationTravelPanel destinationName="Faro" request={request} />);
  fireEvent.change(screen.getByLabelText("Outbound date"), { target: { value: "2027-07-10" } });
  fireEvent.change(screen.getByLabelText("Return date"), { target: { value: "2027-07-15" } });
  save();
  expect(savedRequest()).toEqual({
    ...request,
    timing: { kind: "exact", outboundDate: "2027-07-10", returnDate: "2027-07-15" },
    approximateNights: 5,
  });
  expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^\/destinations\/wikidata%3AQ159457\?.*#getting-there$/), { scroll: false });
});

it.each([
  ["2027-07-10", ""],
  ["2027-07-10", "2027-07-09"],
  ["2027-07-10", "2027-08-10"],
  ["2026-01-01", "2026-01-05"],
  ["2028-01-01", "2028-01-05"],
])("does not save incomplete or unsupported travel dates %s to %s", (outbound, returning) => {
  render(<DestinationTravelPanel destinationName="Faro" request={request} />);
  fireEvent.change(screen.getByLabelText("Outbound date"), { target: { value: outbound } });
  fireEvent.change(screen.getByLabelText("Return date"), { target: { value: returning } });
  save();
  expect(screen.getByRole("alert")).toHaveTextContent("Choose valid departure and return dates");
  expect(replace).not.toHaveBeenCalled();
});
