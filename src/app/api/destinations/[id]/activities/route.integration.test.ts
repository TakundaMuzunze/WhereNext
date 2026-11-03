/** @jest-environment node */
import { POST } from "./route";
import fixtures from "@/features/destination-activities/testing/places.json";
import { prisma } from "@/shared/lib/db/prisma";

jest.mock("server-only", () => ({}), { virtual: true });
const upstream = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const originalFetch = global.fetch;
let sequence = 0;

function request(activities = ["Museums"], id = "wikidata%3AQ159457") {
  return POST(
    new Request("http://localhost/api/destinations/id/activities", {
      method: "POST",
      body: JSON.stringify({ activities }),
    }),
    { params: Promise.resolve({ id }) },
  );
}

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.SHORTLIST_TEST_DATABASE !== "disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/shortlist_test") {
    throw new Error("Use the disposable shortlist database runner.");
  }
});
beforeEach(async () => {
  await prisma.destinationActivityEvidence.deleteMany();
  await prisma.searchReservation.deleteMany({ where: { provider: "geoapify" } });
  await prisma.searchAllowance.deleteMany({ where: { provider: "geoapify" } });
  await prisma.destinationCandidate.upsert({
    where: { id: "wikidata:Q159457" },
    update: { latitude: 37.0333, longitude: -7.9167 },
    create: {
      id: "wikidata:Q159457",
      wikidataId: "Q159457",
      wikivoyagePageId: 11446,
      name: "Faro",
      countryCode: "PT",
      latitude: 37.0333,
      longitude: -7.9167,
      sourceUrl: "https://en.wikivoyage.org/wiki/Faro",
      sourceRevisionId: 123,
      guideStatus: "usable",
      importedAt: new Date("2026-11-03T12:00:00Z"),
    },
  });
  process.env.ACTIVITY_EVIDENCE_ENABLED = "true";
  process.env.GEOAPIFY_API_KEY = `activity-test-key-${++sequence}`;
  upstream.mockReset().mockImplementation(async () =>
    Response.json({
      features: [
        {
          properties: {
            place_id: "museum-1",
            name: "Museu Municipal de Faro",
            categories: ["entertainment.museum"],
            lat: 37.02,
            lon: -7.93,
            datasource: { raw: { osm_id: 1, osm_type: "n" } },
          },
        },
      ],
    }),
  );
  global.fetch = upstream;
});
afterAll(async () => {
  global.fetch = originalFetch;
  await prisma.destinationCandidate.deleteMany({ where: { id: "wikidata:Q159457" } });
  await prisma.$disconnect();
});

it("assesses an imported identity independently of flights and persists reusable source evidence", async () => {
  const response = await request();
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    destinationId: "wikidata:Q159457",
    assessments: [{ activity: "Museums", status: "supported", places: [{ name: "Museu Municipal de Faro", sourceId: "museum-1" }] }],
  });
  expect(upstream).toHaveBeenCalledTimes(1);
  expect(await prisma.destinationActivityEvidence.count()).toBe(1);
  process.env.GEOAPIFY_API_KEY = `another-test-key-${sequence}`;
  const second = await request();
  expect(second.status).toBe(200);
  expect(upstream).toHaveBeenCalledTimes(1);
});

it("retains distinct source records but collapses likely duplicate examples from an actual museum response", async () => {
  upstream.mockResolvedValue(Response.json(fixtures["Q159457-entertainment-museum"].body));
  const response = await request();
  const result = await response.json();
  expect(result.assessments[0]).toMatchObject({ status: "supported", observation: { category: "entertainment.museum", radiusMetres: 4000 } });
  expect(result.assessments[0].places).toHaveLength(7);
  expect(result.assessments[0].observation.places).toHaveLength(8);
});

it("keeps a capped bar response unknown and retains available examples", async () => {
  upstream.mockResolvedValue(Response.json(fixtures["Q159457-catering-bar"].body));
  const response = await request(["Bars"]);
  const result = await response.json();
  expect(result.assessments[0]).toMatchObject({ status: "unknown", reason: "incomplete_evidence", observation: { coverage: "incomplete" } });
  expect(result.assessments[0].places.length).toBeGreaterThan(0);
});

it("does not turn an inland beach into evidence of swimming, quietness or a coastal holiday", async () => {
  await prisma.destinationCandidate.update({ where: { id: "wikidata:Q159457" }, data: { latitude: 37.469972222222, longitude: -7.4731111111111 } });
  upstream.mockResolvedValue(Response.json(fixtures["Q1000041-beach"].body));
  const response = await request(["Beaches", "Swimming", "Quiet beaches", "Island hopping"]);
  const result = await response.json();
  expect(result.assessments.map((item: { status: string }) => item.status)).toEqual(["supported", "unknown", "unknown", "unknown"]);
  expect(upstream).toHaveBeenCalledTimes(1);
});

it("does not call a generic marketplace a food market or infer local restaurant ownership", async () => {
  await prisma.destinationCandidate.update({ where: { id: "wikidata:Q159457" }, data: { latitude: 39.416666666667, longitude: -7.45 } });
  upstream.mockResolvedValue(Response.json(fixtures["Q1000037-commercial-marketplace"].body));
  const response = await request(["Markets", "Food markets", "Local restaurants"]);
  const result = await response.json();
  expect(result.assessments.map((item: { status: string }) => item.status)).toEqual(["supported", "unknown", "unknown"]);
  expect(upstream).toHaveBeenCalledTimes(1);
});

it.each([{ features: [] }, { features: [{ properties: { categories: ["entertainment.museum"] } }] }, { invalid: true }])(
  "treats empty or malformed data as unknown without inventing names: %j",
  async (body) => {
    upstream.mockResolvedValue(Response.json(body));
    const response = await request();
    const result = await response.json();
    expect(result.assessments[0]).toMatchObject({ status: "unknown", places: [] });
  },
);

it("preserves earlier evidence and its retrieval time as stale when refresh fails", async () => {
  const first = await (await request()).json();
  await prisma.destinationActivityEvidence.updateMany({ data: { expiresAt: new Date(0) } });
  process.env.GEOAPIFY_API_KEY = `refresh-test-key-${sequence}`;
  upstream.mockRejectedValue(new Error("source down"));
  const response = await request();
  const result = await response.json();
  expect(result.assessments[0]).toMatchObject({ status: "unknown", reason: "stale_evidence", places: [{ name: "Museu Municipal de Faro" }] });
  expect(result.assessments[0].observation.retrievedAt).toBe(first.assessments[0].observation.retrievedAt);
  expect(await prisma.destinationActivityEvidence.count()).toBe(1);
});

it("does not reuse evidence after the destination coordinates change", async () => {
  await request();
  await prisma.destinationCandidate.update({ where: { id: "wikidata:Q159457" }, data: { latitude: 39 } });
  await request();
  expect(upstream).toHaveBeenCalledTimes(2);
  expect(await prisma.destinationActivityEvidence.count()).toBe(2);
});

it("returns explicit location unknown for a legacy guide without an imported location", async () => {
  const response = await request(["Museums"], "lisbon-portugal");
  await expect(response.json()).resolves.toMatchObject({
    destinationId: "lisbon-portugal",
    assessments: [{ status: "unknown", reason: "location_unknown" }],
  });
  expect(upstream).not.toHaveBeenCalled();
});

it("does not fetch upstream when deliberately disabled or the shared allowance is exhausted", async () => {
  process.env.ACTIVITY_EVIDENCE_ENABLED = "false";
  expect((await (await request()).json()).assessments[0].reason).toBe("unavailable");
  process.env.ACTIVITY_EVIDENCE_ENABLED = "true";
  await prisma.searchAllowance.create({ data: { provider: "geoapify", limit: 0, hourlyLimit: 0, expiresAt: new Date(Date.now() + 60_000) } });
  expect((await (await request()).json()).assessments[0].reason).toBe("unavailable");
  expect(upstream).not.toHaveBeenCalled();
});

it("rejects invalid destinations and unbounded input before spending credits", async () => {
  expect((await request(["Museums"], "wikidata:Q999999999")).status).toBe(404);
  expect((await request(Array(11).fill("Museums"))).status).toBe(400);
  expect((await request([], "wikidata%ZZ")).status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("reuses the same evidence for a linked original guide and its imported alias", async () => {
  await prisma.destinationCandidate.create({
    data: {
      id: "wikidata:Q597",
      wikidataId: "Q597",
      wikivoyagePageId: 19798,
      name: "Lisbon",
      countryCode: "PT",
      latitude: 37.0333,
      longitude: -7.9167,
      sourceUrl: "https://en.wikivoyage.org/wiki/Lisbon",
      sourceRevisionId: 123,
      guideStatus: "usable",
      importedAt: new Date(),
    },
  });
  try {
    const original = await request(["Museums"], "lisbon-portugal");
    expect(original.status).toBe(200);
    const alias = await request(["Museums"], "wikidata:Q597");
    await expect(alias.json()).resolves.toMatchObject({ destinationId: "lisbon-portugal", assessments: [{ status: "supported" }] });
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(await prisma.destinationActivityEvidence.count()).toBe(1);
  } finally {
    await prisma.destinationCandidate.delete({ where: { id: "wikidata:Q597" } });
  }
});

it("fails closed without spending credits when the cache table is unavailable", async () => {
  await prisma.$executeRawUnsafe('ALTER TABLE "DestinationActivityEvidence" RENAME TO "ActivityEvidenceTemporarilyUnavailable"');
  try {
    const response = await request();
    await expect(response.json()).resolves.toMatchObject({ assessments: [{ status: "unknown", reason: "unavailable" }] });
    expect(upstream).not.toHaveBeenCalled();
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "ActivityEvidenceTemporarilyUnavailable" RENAME TO "DestinationActivityEvidence"');
  }
});
