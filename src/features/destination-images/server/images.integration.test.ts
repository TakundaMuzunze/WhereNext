/** @jest-environment node */
import { Pool } from "pg";
import { spawnSync } from "node:child_process";
import { prisma } from "@/shared/lib/db/prisma";
import { persistDestinationImages } from "./persistDestinationImages";
import { readDestinationImages } from "./readDestinationImages";
import type { DestinationImage } from "@/entities/destination/model/destinationImage";

jest.mock("server-only", () => ({}), { virtual: true });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const destinationId = "wikidata:Q159457";
const image: DestinationImage = {
  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Faro.jpg/1280px-Faro.jpg",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Faro.jpg",
  fileTitle: "File:Faro.jpg",
  author: "Test photographer",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "",
  width: 1280,
  height: 960,
};

beforeAll(() => {
  const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || databaseUrl.hostname !== "127.0.0.1" || databaseUrl.pathname !== "/catalogue_test") {
    throw new Error("Use the disposable catalogue database runner.");
  }
});

beforeEach(async () => {
  await prisma.destinationCandidate.deleteMany();
  await prisma.destinationCandidate.create({
    data: {
      id: destinationId,
      wikidataId: "Q159457",
      wikivoyagePageId: 11446,
      name: "Faro",
      countryCode: "PT",
      latitude: 37.0333,
      longitude: -7.9167,
      sourceUrl: "https://en.wikivoyage.org/wiki/Faro",
      sourceRevisionId: 123,
      guideStatus: "usable",
      importedAt: new Date(),
    },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

it("persists optional imagery and returns validated metadata by destination identity", async () => {
  await persistDestinationImages(pool, [{ destinationId, image }]);
  expect((await readDestinationImages([destinationId, destinationId])).get(destinationId)).toEqual(image);
});

it("keeps existing images when a refresh returns no eligible photo", async () => {
  await persistDestinationImages(pool, [{ destinationId, image }]);
  await persistDestinationImages(pool, [{ destinationId, image: null }]);
  expect((await readDestinationImages([destinationId])).get(destinationId)).toEqual(image);
});

it("rolls back the batch if a later destination is invalid", async () => {
  await persistDestinationImages(pool, [{ destinationId, image }]);
  await expect(
    persistDestinationImages(pool, [
      { destinationId, image: { ...image, author: "Must roll back" } },
      { destinationId: "wikidata:Q9999999", image },
    ]),
  ).rejects.toThrow();
  expect((await readDestinationImages([destinationId])).get(destinationId)?.author).toBe("Test photographer");
});

it("ignores invalid persisted metadata and works without the image migration", async () => {
  await pool.query('INSERT INTO "DestinationImage" ("destinationId", "image", "retrievedAt") VALUES ($1, $2, now())', [
    destinationId,
    JSON.stringify({ ...image, src: "javascript:alert(1)" }),
  ]);
  expect(await readDestinationImages([destinationId])).toEqual(new Map());
  await pool.query('ALTER TABLE "DestinationImage" RENAME TO "UnavailableDestinationImage"');
  try {
    expect(await readDestinationImages([destinationId])).toEqual(new Map());
  } finally {
    await pool.query('ALTER TABLE "UnavailableDestinationImage" RENAME TO "DestinationImage"');
  }
});

async function addBackfillCandidates() {
  await prisma.destinationCandidate.createMany({
    data: [2, 3].map((number) => ({
      id: `wikidata:Q${number}`,
      wikidataId: `Q${number}`,
      wikivoyagePageId: number,
      name: `Test place ${number}`,
      countryCode: "PT",
      latitude: 37,
      longitude: -8,
      sourceUrl: "https://en.wikivoyage.org/wiki/Test",
      sourceRevisionId: 123,
      guideStatus: "usable",
      importedAt: new Date(),
    })),
  });
}

function runImageCommand(extraArguments: string[] = [], failId = "") {
  return spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--import",
      "./src/features/destination-images/testing/cliSourceFixture.mjs",
      "scripts/enrich-destination-images.mjs",
      "PT",
      "--limit",
      "1",
      "--all-batches",
      ...extraArguments,
    ],
    { encoding: "utf8", timeout: 20000, env: { ...process.env, IMAGE_TEST_FAIL_ID: failId } },
  );
}

it("backfills every batch from one command, reporting progress without duplicating destinations", async () => {
  await addBackfillCandidates();
  const result = runImageCommand(["--apply"]);
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ mode: "apply", batches: 3, scanned: 3, saved: 3, nextCursor: null });
  expect(result.stderr).toContain("Batch 3");
  expect((await readDestinationImages([destinationId, "wikidata:Q2", "wikidata:Q3"])).size).toBe(3);
}, 20000);

it("stops on source failure, retains completed batches and resumes with the reported cursor", async () => {
  await addBackfillCandidates();
  const failedRun = runImageCommand(["--apply"], "Q2");
  expect(failedRun.status).toBe(1);
  expect(failedRun.stderr).toContain("Stopped after 1 completed batches");
  expect(failedRun.stderr).toContain("--cursor PT:Q159457 --apply");
  expect((await readDestinationImages([destinationId, "wikidata:Q2", "wikidata:Q3"])).size).toBe(1);
  const resumedRun = runImageCommand(["--cursor", "PT:Q159457", "--apply"]);
  expect(resumedRun.status).toBe(0);
  expect(JSON.parse(resumedRun.stdout)).toMatchObject({ batches: 2, scanned: 2, saved: 2 });
  expect((await readDestinationImages([destinationId, "wikidata:Q2", "wikidata:Q3"])).size).toBe(3);
}, 20000);

it("keeps all-batches preview read-only", async () => {
  await addBackfillCandidates();
  const result = runImageCommand();
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ mode: "preview", batches: 3, scanned: 3, available: 3, saved: 0 });
  expect((await readDestinationImages([destinationId, "wikidata:Q2", "wikidata:Q3"])).size).toBe(0);
}, 20000);
