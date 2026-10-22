import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DiscoveryPanel } from "./DiscoveryPanel";
import type { DatedTripRequest } from "@/entities/trip/model/datedTripRequestSchema";
const request: DatedTripRequest = {
  kind: "dated",
  departureAirportCode: "LHR",
  outboundDate: "2026-11-10",
  returnDate: "2026-11-14",
  adultCount: 2,
  currency: "GBP",
  groupBudgetPence: 200000,
  dailyAllowancePerPersonPence: 3000,
  preferences: { tripType: "city-break", activities: ["Museums"] },
};
const originalFetch = global.fetch;
const upstream = jest.fn();
beforeEach(() => {
  global.fetch = upstream;
  upstream.mockReset();
});
afterEach(() => {
  global.fetch = originalFetch;
});
it("waits for an explicit search and explains an empty cache without claiming no flights exist", async () => {
  upstream.mockResolvedValue({ json: async () => ({ status: "empty" }) });
  render(<DiscoveryPanel request={request} />);
  expect(upstream).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Find destinations" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("This does not mean flights are unavailable"));
  expect(upstream).toHaveBeenCalledWith("/api/discovery", expect.objectContaining({ method: "POST", body: JSON.stringify(request) }));
});
it("handles a broken response with a recoverable message", async () => {
  upstream.mockResolvedValue({ json: async () => ({ wrong: "shape" }) });
  render(<DiscoveryPanel request={request} />);
  fireEvent.click(screen.getByRole("button", { name: "Find destinations" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("couldn’t complete the search"));
  expect(screen.getByRole("button", { name: "Search again" })).toBeEnabled();
});
