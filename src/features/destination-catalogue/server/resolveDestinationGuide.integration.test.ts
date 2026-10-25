/** @jest-environment node */
import { prisma } from "@/shared/lib/db/prisma";
import { resolveDestinationGuide } from "./resolveDestinationGuide";

jest.mock("server-only", () => ({}), { virtual: true });

function assertDisposableDatabase() {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
  const isDisposableDatabase = process.env.CATALOGUE_TEST_DATABASE === "disposable";
  const isLocalDatabase = databaseUrl.hostname === "127.0.0.1";
  const hasExpectedDatabaseName = databaseUrl.pathname === "/catalogue_test";

  if (!isDisposableDatabase || !isLocalDatabase || !hasExpectedDatabaseName) {
    throw new Error("Use the disposable catalogue database runner.");
  }
}

beforeAll(assertDisposableDatabase);

beforeEach(async () => {
  assertDisposableDatabase();
  await prisma.destinationCandidate.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

it("resolves a verified Wikidata identity to the existing Lisbon guide", async () => {
  const guide = await resolveDestinationGuide("wikidata:Q597");

  expect(guide).toMatchObject({
    id: "lisbon-portugal",
    name: "Lisbon",
    country: "Portugal",
  });
});

it("preserves the existing guide identity when called with a legacy ID", async () => {
  const guide = await resolveDestinationGuide("lisbon-portugal");

  expect(guide).toMatchObject({ id: "lisbon-portugal", name: "Lisbon" });
});

it.each([
  ["Q597", "lisbon-portugal"],
  ["Q31487", "krakow-poland"],
  ["Q1492", "barcelona-spain"],
  ["Q1663", "split-croatia"],
  ["Q26831", "algarve-portugal"],
  ["Q129296", "santorini-greece"],
  ["Q101625", "marrakech-morocco"],
  ["Q1764", "reykjavik-iceland"],
  ["Q1781", "budapest-hungary"],
  ["Q212214", "amalfi-coast-italy"],
  ["Q40846", "tenerife-spain"],
  ["Q64", "berlin-germany"],
])("keeps verified identity %s and legacy guide %s consistent", async (wikidataId, legacyId) => {
  const linkedGuide = await resolveDestinationGuide(`wikidata:${wikidataId}`);
  const legacyGuide = await resolveDestinationGuide(legacyId);

  expect(linkedGuide?.id).toBe(legacyId);
  expect(linkedGuide).toEqual(legacyGuide);
});

it.each([null, 597, {}, "", "Q597", "wikidata:Q0", "wikidata:Q597:extra", "Lisbon", "unknown-guide", "x".repeat(129)])(
  "leaves unknown or malformed identity %j unresolved",
  async (input) => {
    expect(await resolveDestinationGuide(input)).toBeNull();
  },
);

it("does not infer a guide from a matching imported name", async () => {
  await prisma.destinationCandidate.create({
    data: {
      id: "wikidata:Q159457",
      wikidataId: "Q159457",
      wikivoyagePageId: 11446,
      name: "Lisbon",
      countryCode: "PT",
      latitude: 37.0333,
      longitude: -7.9167,
      sourceUrl: "https://en.wikivoyage.org/wiki/Faro",
      sourceRevisionId: 123,
      guideStatus: "usable",
      importedAt: new Date("2026-10-25T12:00:00Z"),
    },
  });

  try {
    expect(await resolveDestinationGuide("wikidata:Q159457")).toBeNull();
  } finally {
    await prisma.destinationCandidate.delete({ where: { id: "wikidata:Q159457" } });
  }
});

it("keeps the Algarve region separate from a city inside it", async () => {
  const regionGuide = await resolveDestinationGuide("wikidata:Q26831");
  const cityGuide = await resolveDestinationGuide("wikidata:Q159457");

  expect(regionGuide?.id).toBe("algarve-portugal");
  expect(cityGuide).toBeNull();
});

it("does not fabricate a guide when a stored link points to a missing legacy ID", async () => {
  await prisma.destinationGuideIdentity.create({
    data: { wikidataId: "Q900000001", legacyDestinationId: "missing-guide" },
  });

  try {
    expect(await resolveDestinationGuide("wikidata:Q900000001")).toBeNull();
  } finally {
    await prisma.destinationGuideIdentity.delete({ where: { wikidataId: "Q900000001" } });
  }
});

it("allows multiple verified aliases to resolve to the same existing guide", async () => {
  await prisma.destinationGuideIdentity.create({
    data: { wikidataId: "Q900000002", legacyDestinationId: "lisbon-portugal" },
  });

  try {
    const originalGuide = await resolveDestinationGuide("wikidata:Q597");
    const aliasGuide = await resolveDestinationGuide("wikidata:Q900000002");

    expect(aliasGuide?.id).toBe("lisbon-portugal");
    expect(aliasGuide).toEqual(originalGuide);
  } finally {
    await prisma.destinationGuideIdentity.delete({ where: { wikidataId: "Q900000002" } });
  }
});

it("preserves legacy reads during a link-table outage without disguising linked lookup failures", async () => {
  await prisma.$executeRawUnsafe('ALTER TABLE "DestinationGuideIdentity" RENAME TO "UnavailableGuideIdentity"');

  try {
    expect(await resolveDestinationGuide("lisbon-portugal")).toMatchObject({ id: "lisbon-portugal" });
    await expect(resolveDestinationGuide("wikidata:Q597")).rejects.toThrow();
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "UnavailableGuideIdentity" RENAME TO "DestinationGuideIdentity"');
  }
});
