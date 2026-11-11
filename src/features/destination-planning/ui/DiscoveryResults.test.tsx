import { assessSeason } from "@/features/destination-seasons/lib/assessSeason";
import type { ClimateObservation } from "@/features/destination-seasons/model/climateObservation";
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
  expect(screen.getByText("Local restaurants: evidence pending")).toBeInTheDocument();
  expect(screen.getByText(/Not assessed yet:.*Street food/)).toBeInTheDocument();
  expect(screen.getByText(/Earlier examples need a fresh check/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Explore Alcoutim" })).toHaveAttribute("href", expect.stringContaining("/destinations/wikidata%3AQ1?"));
  expect(screen.getByText("How these results work").closest("details")).not.toHaveAttribute("open");
  expect(screen.getByRole("link", { name: "Edit request" })).toHaveAttribute("href", expect.stringContaining("/planner?"));
});

const beachRequest: DiscoveryRequest = { ...request, timing: { kind: "month", month: "2027-07" }, activities: ["Beaches"] };

function seasonalCandidate(name: string, temperature: number | null) {
  const observation: ClimateObservation = {
    source: "nasa-power",
    apiVersion: "test",
    baselineStart: 1991,
    baselineEnd: 2020,
    latitude: 38.5,
    longitude: -9.375,
    elevationMetres: 24,
    retrievedAt: "2026-11-06T12:00:00Z",
    months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, meanTemperatureC: temperature, precipitationMmPerDay: 1 })),
  };
  return {
    id: name,
    name,
    country: "Portugal",
    assessments: [],
    seasonalGuidance: assessSeason(observation, beachRequest.timing, beachRequest.activities),
  };
}

const seasonalCandidates = [seasonalCandidate("Matching place", 20), seasonalCandidate("Hot place", 30), seasonalCandidate("Unverified place", null)];

it("defaults to seasonal matches and provides separate trade-off and unverified views", async () => {
  jest.mocked(getDiscoveryResults).mockResolvedValue({ evidenceUnavailable: false, candidates: seasonalCandidates });
  render(await DiscoveryResults({ request: beachRequest }));
  expect(screen.getByRole("article", { name: "Matching place, Portugal" })).toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "Hot place, Portugal" })).not.toBeInTheDocument();
  expect(screen.queryByRole("article", { name: "Unverified place, Portugal" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Trade-offs 1" })).toHaveAttribute("href", expect.stringContaining("seasonal=tradeoffs"));
  expect(screen.getByRole("link", { name: "Unverified 1" })).toHaveAttribute("href", expect.stringContaining("seasonal=unverified"));
});

it.each(["tradeoffs", "unverified"] as const)("preserves the selected %s view during pagination", async (seasonalView) => {
  const candidate = seasonalView === "tradeoffs" ? seasonalCandidates[1] : seasonalCandidates[2];
  const candidates = Array.from({ length: 13 }, (_, index) => ({ ...candidate, id: String(index), name: `${candidate.name} ${index}` }));
  jest.mocked(getDiscoveryResults).mockResolvedValue({ evidenceUnavailable: false, candidates });
  render(await DiscoveryResults({ request: beachRequest, seasonalView }));
  expect(screen.getAllByRole("article")).toHaveLength(12);
  expect(screen.getByRole("link", { name: "More destinations" })).toHaveAttribute("href", expect.stringContaining(`seasonal=${seasonalView}&page=2`));
});

it("explains an empty seasonal match list without silently including conflicts or unknowns", async () => {
  jest.mocked(getDiscoveryResults).mockResolvedValue({ evidenceUnavailable: false, candidates: seasonalCandidates.slice(1) });
  render(await DiscoveryResults({ request: beachRequest }));
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("No destinations have a verified seasonal match yet");
});

it("marks the current climate view and disables empty filters", async () => {
  jest.mocked(getDiscoveryResults).mockResolvedValue({ evidenceUnavailable: false, candidates: seasonalCandidates.slice(0, 1) });
  render(await DiscoveryResults({ request: beachRequest }));
  expect(screen.getByRole("link", { name: "Climate matches 1" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Trade-offs 0" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Unverified 0" })).toBeDisabled();
  expect(screen.queryByRole("link", { name: "Unverified 0" })).not.toBeInTheDocument();
  expect(screen.getByText(/Regional climate matches your July 2027 preferences/)).toBeInTheDocument();
});
