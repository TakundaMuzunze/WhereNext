/** @jest-environment node */

import DestinationPage from "./page";
import { prisma } from "@/shared/lib/db/prisma";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("better-auth/react", () => ({ createAuthClient: () => ({}) }));

beforeAll(() => {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");

  if (process.env.SHORTLIST_TEST_DATABASE !== "disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/shortlist_test") {
    throw new Error("Use npm run test:shortlists:db to supply an isolated disposable database.");
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

it("opens a verified destination URL with the original guide and planner context", async () => {
  const page = await DestinationPage({
    params: Promise.resolve({ id: "wikidata:Q597" }),
    searchParams: Promise.resolve({
      departure: "London",
      month: "June",
      duration: "5",
      budget: "2000",
      travellers: "2",
      tripType: "city-break",
      activity: "Museums",
    }),
  });

  expect(page).toMatchObject({
    props: {
      destination: { id: "lisbon-portugal", name: "Lisbon" },
      recommendation: { destination: { id: "lisbon-portugal" } },
      backHref: expect.stringContaining("/results?"),
      editHref: expect.stringContaining("/planner?"),
    },
  });
});

it.each(["lisbon-portugal", "wikidata:Q597", "wikidata%3AQ597"])("opens %s without planner answers", async (id) => {
  const page = await DestinationPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) });
  expect(page).toMatchObject({ props: { destination: { id: "lisbon-portugal" } } });
});

it.each(["wikidata:Q1000037", "wikidata:Q0", "missing", "wikidata%ZZQ597"])("returns not found for an unsupported guide: %s", async (id) => {
  await expect(DestinationPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) })).rejects.toThrow(
    "NEXT_HTTP_ERROR_FALLBACK;404",
  );
});

it("opens an imported destination without inventing a guide or requiring prices", async () => {
  await prisma.destinationCandidate.create({
    data: {
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
      importedAt: new Date("2026-10-25T12:00:00Z"),
    },
  });

  try {
    const page = await DestinationPage({
      params: Promise.resolve({ id: "wikidata%3AQ159457" }),
      searchParams: Promise.resolve({}),
    });
    expect(page).toMatchObject({
      props: {
        destination: { id: "wikidata:Q159457", name: "Faro", sourceUrl: "https://en.wikivoyage.org/wiki/Faro" },
      },
    });
  } finally {
    await prisma.destinationCandidate.delete({ where: { id: "wikidata:Q159457" } });
  }
});
