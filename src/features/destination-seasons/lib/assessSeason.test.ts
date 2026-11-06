import type { ClimateObservation } from "../model/climateObservation";
import { assessSeason, seasonalFit } from "./assessSeason";

const climate: ClimateObservation = {
  source: "nasa-power",
  apiVersion: "v2.10.1",
  baselineStart: 1991,
  baselineEnd: 2020,
  latitude: 38.5,
  longitude: -9.375,
  elevationMetres: 24,
  retrievedAt: "2026-11-06T12:00:00Z",
  months: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, meanTemperatureC: 20, precipitationMmPerDay: 1 })),
};

it("separates beach climate preferences from milder walking preferences without scoring indoor interests", () => {
  const july = { ...climate, months: climate.months.map((month) => ({ ...month, meanTemperatureC: 25 })) };
  const guidance = assessSeason(july, { kind: "month", month: "2027-07" }, ["Beaches", "Walking tours", "Museums"]);

  expect(guidance.months).toHaveLength(1);
  expect(guidance.months[0].preferences).toEqual([
    { kind: "beach", status: "within_preferences" },
    { kind: "sightseeing", status: "trade_offs" },
  ]);
  expect(guidance.ranking).toEqual({ matched: 1, tradeOffs: 1 });
});

it("suggests flexible months using both preferences and keeps year-crossing exact trips distinct", () => {
  const varied = {
    ...climate,
    months: climate.months.map((month) => ({ ...month, precipitationMmPerDay: month.month === 7 ? 1 : 3 })),
  };

  expect(assessSeason(varied, { kind: "flexible" }, ["Beaches", "Architecture"]).recommendedMonths).toEqual([7]);
  const exact = assessSeason(varied, { kind: "exact", outboundDate: "2027-12-28", returnDate: "2028-01-04" }, ["Beaches"]);
  expect(exact.months.map((month) => month.month)).toEqual([12, 1]);
  expect(exact.ranking).toEqual({ matched: 0, tradeOffs: 1 });
});

it("keeps missing evidence and unsupported indoor interests unknown instead of inventing climate matches", () => {
  expect(assessSeason(null, { kind: "month", month: "2027-07" }, ["Beaches"]).months[0].preferences).toEqual([{ kind: "beach", status: "unknown" }]);
  const indoors = assessSeason(climate, { kind: "flexible" }, ["Museums", "Bars", "Swimming"]);
  expect(indoors.recommendedMonths).toEqual([]);
  expect(indoors.ranking).toEqual({ matched: 0, tradeOffs: 0 });
});

it("retains flexible trade-offs when every month is outside the preference band", () => {
  const wet = { ...climate, months: climate.months.map((month) => ({ ...month, precipitationMmPerDay: 3 })) };
  expect(assessSeason(wet, { kind: "flexible" }, ["Beaches"]).ranking).toEqual({ matched: 0, tradeOffs: 1 });
});

it.each([
  { temperature: 18, rain: 2, status: "within_preferences" },
  { temperature: 26, rain: 0, status: "within_preferences" },
  { temperature: 17.9, rain: 1, status: "trade_offs" },
  { temperature: 26.1, rain: 1, status: "trade_offs" },
  { temperature: 20, rain: 2.01, status: "trade_offs" },
  { temperature: 20, rain: null, status: "unknown" },
])("applies the reviewed inclusive beach bands: %j", ({ temperature, rain, status }) => {
  const varied = { ...climate, months: climate.months.map((month) => ({ ...month, meanTemperatureC: temperature, precipitationMmPerDay: rain })) };
  const guidance = assessSeason(varied, { kind: "month", month: "2027-07" }, ["Beaches"]);
  expect(guidance.months[0].preferences[0].status).toBe(status);
});

it("does not let one matching month confirm a cross-month trip when the other month is unknown", () => {
  const incomplete = {
    ...climate,
    months: climate.months.map((month) => ({ ...month, meanTemperatureC: month.month === 1 ? null : 20 })),
  };
  expect(assessSeason(incomplete, { kind: "exact", outboundDate: "2027-12-28", returnDate: "2028-01-04" }, ["Beaches"]).ranking).toEqual({
    matched: 0,
    tradeOffs: 0,
  });
});

it("separates matching, conflicting and unverified seasonal fit", () => {
  const timing = { kind: "month", month: "2027-07" } as const;
  expect(seasonalFit(assessSeason(climate, timing, ["Beaches"]), timing)).toBe("matching");
  const hot = { ...climate, months: climate.months.map((month) => ({ ...month, meanTemperatureC: 30 })) };
  expect(seasonalFit(assessSeason(hot, timing, ["Beaches"]), timing)).toBe("tradeoffs");
  expect(seasonalFit(assessSeason(null, timing, ["Beaches"]), timing)).toBe("unverified");
  expect(seasonalFit(assessSeason(null, timing, ["Museums"]), timing)).toBe("matching");
});

it("requires one complete matching month for flexible travel and every crossed month for exact travel", () => {
  const varied = { ...climate, months: climate.months.map((month) => ({ ...month, meanTemperatureC: month.month === 7 ? 20 : 30 })) };
  const flexible = { kind: "flexible" } as const;
  expect(seasonalFit(assessSeason(varied, flexible, ["Beaches"]), flexible)).toBe("matching");
  const exact = { kind: "exact", outboundDate: "2027-07-28", returnDate: "2027-08-04" } as const;
  expect(seasonalFit(assessSeason(varied, exact, ["Beaches"]), exact)).toBe("tradeoffs");
  const missing = {
    ...varied,
    months: varied.months.map((month) => ({ ...month, meanTemperatureC: month.month === 8 ? null : month.meanTemperatureC })),
  };
  expect(seasonalFit(assessSeason(missing, exact, ["Beaches"]), exact)).toBe("unverified");
});

it("keeps potentially matching flexible months unverified rather than treating missing data as a conflict", () => {
  const incomplete = { ...climate, months: climate.months.map((month) => ({ ...month, meanTemperatureC: month.month === 7 ? null : 30 })) };
  const timing = { kind: "flexible" } as const;
  expect(seasonalFit(assessSeason(incomplete, timing, ["Beaches"]), timing)).toBe("unverified");
});
