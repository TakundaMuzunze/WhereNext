import { render, screen } from "@testing-library/react";
import { assessSeason } from "../lib/assessSeason";
import type { ClimateObservation } from "../model/climateObservation";
import { SeasonalEvidence, SeasonalSummary } from "./SeasonalGuidance";

const observation: ClimateObservation = {
  source: "nasa-power",
  apiVersion: "v2.10.1",
  baselineStart: 1991,
  baselineEnd: 2020,
  latitude: 37.5,
  longitude: 22.5,
  elevationMetres: 675,
  retrievedAt: "2026-11-06T12:00:00Z",
  months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, meanTemperatureC: 22, precipitationMmPerDay: 0.78 })),
};

it("shows selected-month conditions once and keeps interpretation details collapsed", () => {
  render(<SeasonalEvidence guidance={assessSeason(observation, { kind: "month", month: "2027-06" }, ["Beaches", "Beach parties"])} />);
  expect(screen.getByRole("heading", { name: "June" })).toBeInTheDocument();
  expect(screen.getAllByText("22.0°C")).toHaveLength(1);
  expect(screen.getByText(/matches our climate preferences/)).toBeInTheDocument();
  expect(screen.getByText(/not a forecast for your dates/)).toBeInTheDocument();
  expect(screen.getByText(/local events remain unverified/)).toBeInTheDocument();
  expect(screen.getByText("How to read this climate data").closest("details")).not.toHaveAttribute("open");
  expect(screen.queryByText("View monthly climate and preference trade-offs")).not.toBeInTheDocument();
});

it("retains both months of a cross-year trip behind the monthly disclosure", () => {
  render(
    <SeasonalEvidence guidance={assessSeason(observation, { kind: "exact", outboundDate: "2027-12-28", returnDate: "2028-01-04" }, ["Beaches"])} />,
  );
  expect(screen.getByText(/Your trip spans December and January/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "December" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "January" })).toBeInTheDocument();
  expect(screen.getByText("View monthly climate and preference trade-offs").closest("details")).not.toHaveAttribute("open");
});

it("does not imply seasonal activity fit for nightlife interests", () => {
  render(<SeasonalEvidence guidance={assessSeason(observation, { kind: "month", month: "2027-06" }, ["Beach parties"])} />);
  expect(screen.getByText(/we don’t assess seasonal fit for your selected interests/)).toBeInTheDocument();
  expect(screen.queryByText(/matches our climate preferences/)).not.toBeInTheDocument();
});

it("keeps missing data explicit without displaying invented conditions", () => {
  render(<SeasonalEvidence guidance={assessSeason(null, { kind: "month", month: "2027-06" }, ["Beaches"])} />);
  expect(screen.getByText(/Seasonal guidance: unknown/)).toBeInTheDocument();
  expect(screen.queryByText("Mean air temperature")).not.toBeInTheDocument();
});

it("shows incomplete metrics as unknown and retains flexible month suggestions", () => {
  const incomplete = { ...observation, months: observation.months.map((month) => ({ ...month, meanTemperatureC: null })) };
  const { unmount } = render(<SeasonalEvidence guidance={assessSeason(incomplete, { kind: "month", month: "2027-06" }, ["Beaches"])} />);
  expect(screen.getByText("unknown")).toBeInTheDocument();
  expect(screen.getByText(/not enough climate data/)).toBeInTheDocument();
  unmount();
  render(<SeasonalEvidence guidance={assessSeason(observation, { kind: "flexible" }, ["Beaches"])} />);
  expect(screen.getByText(/Climate periods worth considering: January, February/)).toBeInTheDocument();
});

it("keeps result summaries compact with a climate caveat and no repeated source link", () => {
  render(<SeasonalSummary guidance={assessSeason(observation, { kind: "month", month: "2027-06" }, ["Beaches"])} />);
  expect(screen.getByText("June · 22.0°C mean air · 0.78 mm/day precipitation")).toBeInTheDocument();
  expect(screen.getByText("Beach climate: matches our climate preferences")).toBeInTheDocument();
  expect(screen.getByText(/Historical regional averages · not a forecast/)).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
});
