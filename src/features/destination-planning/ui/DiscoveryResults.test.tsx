import { render, screen } from "@testing-library/react";
import { DiscoveryResults } from "./DiscoveryResults";
import { getDiscoveryResults } from "../server/getDiscoveryResults";
import type { DiscoveryRequest } from "../model/discoveryRequest";

jest.mock("../server/getDiscoveryResults", () => ({ getDiscoveryResults: jest.fn() }));
jest.mock("@/features/saved-destinations", () => ({ SaveDestinationButton: () => <button>Save destination</button> }));

const request: DiscoveryRequest = {
  kind: "discovery",
  timing: { kind: "flexible" },
  approximateNights: 5,
  adultCount: 2,
  groupBudgetPence: 200000,
  activities: ["Local restaurants", "Street food", "Scenic views"],
};

it("groups interests without evidence while preserving stale evidence warnings and navigation", async () => {
  jest.mocked(getDiscoveryResults).mockResolvedValue({
    evidenceUnavailable: false,
    candidates: [
      {
        id: "wikidata:Q1",
        name: "Alcoutim",
        country: "Portugal",
        assessments: [
          { activity: "Local restaurants", status: "unknown", reason: "unavailable", places: [], observation: null },
          { activity: "Street food", status: "unknown", reason: "unsupported_interest", places: [], observation: null },
          { activity: "Scenic views", status: "unknown", reason: "stale_evidence", places: [], observation: null },
        ],
      },
    ],
  });
  render(await DiscoveryResults({ request }));
  expect(screen.getByText("Local restaurants · Street food")).toBeInTheDocument();
  expect(screen.getAllByText("We don’t yet have verified information for these interests.")).toHaveLength(1);
  expect(screen.getByText(/earlier evidence has expired/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Explore Alcoutim" })).toHaveAttribute("href", expect.stringContaining("/destinations/wikidata%3AQ1?"));
  expect(screen.getByText("How these results work").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("link", { name: "Edit request" })).toHaveAttribute("href", expect.stringContaining("/planner?"));
});
