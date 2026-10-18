import { createDatedTripRequestSchema } from "./datedTripRequestSchema";

const validRequest = {
  kind: "dated",
  departureAirportCode: "LHR",
  currency: "GBP",
  adultCount: 2,
  groupBudgetPence: 200_000,
  dailyAllowancePerPersonPence: 5_000,
  outboundDate: "2026-11-10",
  returnDate: "2026-11-14",
  preferences: { tripType: "city-break", activities: ["Museums"] },
};

const schema = createDatedTripRequestSchema("2026-10-18");

describe("dated trip request validation", () => {
  it("accepts a complete request and removes duplicate activities", () => {
    const request = { ...validRequest, preferences: { tripType: "city-break", activities: ["Museums", "Museums", "Shopping"] } };
    expect(schema.parse(request)).toEqual({ ...request, preferences: { ...request.preferences, activities: ["Museums", "Shopping"] } });
  });

  it.each([
    { departureAirportCode: "London" },
    { currency: "EUR" },
    { kind: "legacy" },
    { adultCount: 0 },
    { adultCount: 10 },
    { adultCount: 2.5 },
    { adultCount: "2" },
    { groupBudgetPence: 99 },
    { groupBudgetPence: 10_000_001 },
    { groupBudgetPence: 100.5 },
    { groupBudgetPence: NaN },
    { dailyAllowancePerPersonPence: -1 },
    { dailyAllowancePerPersonPence: 100_001 },
    { dailyAllowancePerPersonPence: 0.5 },
    { dailyAllowancePerPersonPence: Infinity },
    { outboundDate: "2026-02-30" },
    { outboundDate: "2026-11-10T00:00:00Z" },
    { returnDate: "2026-11-31" },
    { outboundDate: "2026-10-17" },
    { outboundDate: "2027-10-19", returnDate: "2027-10-20" },
    { returnDate: "2026-11-10" },
    { returnDate: "2026-11-09" },
    { returnDate: "2026-12-09" },
    { duration: 4 },
    { month: "November" },
    { preferences: { tripType: "unknown", activities: ["Museums"] } },
    { preferences: { tripType: "city-break", activities: [] } },
    { preferences: { tripType: "city-break", activities: ["Hiking"] } },
    { preferences: { tripType: "city-break", activities: ["Unknown"] } },
  ])("rejects invalid input: %j", (changes) => {
    expect(schema.safeParse({ ...validRequest, ...changes }).success).toBe(false);
  });

  it.each([
    { adultCount: 1, groupBudgetPence: 100, dailyAllowancePerPersonPence: 0 },
    { adultCount: 9, groupBudgetPence: 10_000_000, dailyAllowancePerPersonPence: 100_000 },
    { outboundDate: "2026-10-18", returnDate: "2026-10-19" },
    { outboundDate: "2027-10-18", returnDate: "2027-11-15" },
    { groupBudgetPence: 100, dailyAllowancePerPersonPence: 100_000 },
  ])("accepts valid boundaries: %j", (changes) => {
    expect(schema.safeParse({ ...validRequest, ...changes }).success).toBe(true);
  });

  it.each([
    ["2028-02-28", "2028-02-29", "2028-03-01"],
    ["2026-03-01", "2026-03-28", "2026-04-25"],
    ["2026-10-01", "2026-10-24", "2026-11-21"],
  ])("accepts calendar dates across leap days and clock changes", (today, outboundDate, returnDate) => {
    expect(createDatedTripRequestSchema(today).safeParse({ ...validRequest, outboundDate, returnDate }).success).toBe(true);
  });

  it("rejects a leap day in a non-leap year", () => {
    expect(schema.safeParse({ ...validRequest, outboundDate: "2027-02-29", returnDate: "2027-03-01" }).success).toBe(false);
  });

  it("attaches relationship errors to the relevant fields", () => {
    const result = schema.safeParse({ ...validRequest, outboundDate: "2026-10-17", returnDate: "2026-10-17" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(({ path }) => path)).toEqual([["outboundDate"], ["returnDate"]]);
    }
  });

  it("validates the injected today value", () => {
    expect(() => createDatedTripRequestSchema("not-a-date")).toThrow();
  });
});
