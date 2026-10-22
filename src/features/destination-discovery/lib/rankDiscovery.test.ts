import { rankDiscovery } from "./rankDiscovery";
import type { DiscoveryRecommendation } from "../model/discovery";
const option: DiscoveryRecommendation = {
  id: "one",
  name: "Faro",
  country: "Portugal",
  airport: "FAO",
  geonamesId: 2268339,
  evidence: [],
  flightPerAdultPence: 10000,
  estimatedGroupFlightsPence: 20000,
  spendingPence: 30000,
  remainingForStayPence: 50000,
  onwardUrl: "https://www.aviasales.com/search/test",
  retrievedAt: "2026-10-20T12:00:00Z",
  stops: 0,
};
it("prefers room for a stay, then activity evidence, then lower estimated flights without mutating input", () => {
  const supported = { activity: "Museums", status: "supported", places: [] } satisfies DiscoveryRecommendation["evidence"][number];
  const options = [
    { ...option, id: "over-budget", remainingForStayPence: -1, evidence: [supported] },
    { ...option, id: "unknown-cheap", estimatedGroupFlightsPence: 1000 },
    { ...option, id: "supported-expensive", evidence: [supported] },
    { ...option, id: "supported-cheaper", evidence: [supported], estimatedGroupFlightsPence: 15000 },
  ];
  expect(rankDiscovery(options).map(({ id }) => id)).toEqual(["supported-cheaper", "supported-expensive", "unknown-cheap", "over-budget"]);
  expect(options[0].id).toBe("over-budget");
});
