/** @jest-environment node */
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { PATCH } from "./route";

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
const destinationId = "lisbon-portugal";
function change(addTo: string[], removeFrom: string[], extra: Record<string, unknown> = {}) {
  return PATCH(
    new Request("http://localhost/api/shortlists/memberships", {
      method: "PATCH",
      body: JSON.stringify({ destinationId, addTo, removeFrom, ...extra }),
    }),
  );
}
function assertDisposableDatabase() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  if (process.env.SHORTLIST_TEST_DATABASE !== "disposable" || url.hostname !== "127.0.0.1" || url.pathname !== "/shortlist_test") {
    throw new Error("Use npm run test:shortlists:db to supply an isolated disposable database.");
  }
}
beforeAll(assertDisposableDatabase);
beforeEach(async () => {
  assertDisposableDatabase();
  await prisma.user.deleteMany();
  await prisma.user.createMany({ data: ["alice", "bob"].map((id) => ({ id, name: id, email: `${id}@example.test` })) });
  await prisma.shortlist.createMany({
    data: [
      { id: "a", userId: "alice", shortlistName: "A" },
      { id: "b", userId: "alice", shortlistName: "B" },
      { id: "c", userId: "alice", shortlistName: "C" },
      { id: "other", userId: "bob", shortlistName: "Private" },
    ],
  });
  jest.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "alice", name: "Alice", email: "alice@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: "session", userId: "alice", token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  });
});
afterAll(async () => {
  await prisma.$disconnect();
});

it("applies explicit changes, deduplicates IDs, and preserves other memberships and destinations", async () => {
  await prisma.shortlistItem.createMany({
    data: [
      { shortlistId: "a", destinationId },
      { shortlistId: "c", destinationId },
      { shortlistId: "other", destinationId },
      { shortlistId: "a", destinationId: "another-destination" },
    ],
  });
  const response = await change(["b", "b"], ["a"], { userId: "bob" });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ destinationId, shortlistIds: ["b", "c"], isSaved: true });
  expect(await prisma.shortlistItem.count({ where: { shortlistId: "a", destinationId } })).toBe(0);
  expect(await prisma.shortlistItem.count({ where: { shortlistId: "other", destinationId } })).toBe(1);
  expect(await prisma.shortlistItem.count({ where: { shortlistId: "a", destinationId: "another-destination" } })).toBe(1);
});

it.each(["missing", "other"])("rejects unavailable reference %s without any partial changes", async (id) => {
  await prisma.shortlistItem.create({ data: { shortlistId: "a", destinationId } });
  expect((await change(["b", id], ["a"])).status).toBe(404);
  expect(await prisma.shortlistItem.findMany()).toEqual([expect.objectContaining({ shortlistId: "a", destinationId })]);
  expect((await change(["b"], [id])).status).toBe(404);
  expect(await prisma.shortlistItem.count()).toBe(1);
});

it("treats repeated additions and removals as successful and keeps empty lists", async () => {
  expect((await change(["a"], [])).status).toBe(200);
  expect((await change(["a"], [])).status).toBe(200);
  expect(await prisma.shortlistItem.count()).toBe(1);
  expect((await change([], ["a"])).status).toBe(200);
  const response = await change([], ["a"]);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ destinationId, shortlistIds: [], isSaved: false });
  expect(await prisma.shortlist.count()).toBe(4);
  expect(await prisma.shortlistItem.count()).toBe(0);
});

it("rolls back additions when a later deletion fails", async () => {
  await prisma.shortlistItem.create({ data: { shortlistId: "a", destinationId } });
  await prisma.$executeRawUnsafe(
    `CREATE FUNCTION test_reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced deletion failure'; END $$`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE TRIGGER test_reject_delete BEFORE DELETE ON "ShortlistItem" FOR EACH ROW EXECUTE FUNCTION test_reject_delete()`,
  );
  try {
    await expect(change(["b"], ["a"])).rejects.toThrow();
    expect(await prisma.shortlistItem.findMany()).toEqual([expect.objectContaining({ shortlistId: "a", destinationId })]);
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER test_reject_delete ON "ShortlistItem"');
    await prisma.$executeRawUnsafe("DROP FUNCTION test_reject_delete()");
  }
});

it("preserves unrelated concurrent additions and prevents duplicate memberships", async () => {
  const responses = await Promise.all([change(["a"], []), change(["b"], []), change(["a"], [])]);
  expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
  expect(await prisma.shortlistItem.count()).toBe(2);
});

it("serializes opposing changes to the same membership", async () => {
  const [addition, removal] = await Promise.all([change(["a"], []), change([], ["a"])]);
  expect(addition.status).toBe(200);
  expect(removal.status).toBe(200);
  await expect(addition.json()).resolves.toMatchObject({ shortlistIds: ["a"], isSaved: true });
  await expect(removal.json()).resolves.toMatchObject({ shortlistIds: [], isSaved: false });
  const count = await prisma.shortlistItem.count();
  expect([0, 1]).toContain(count);
  // A subsequent operation observes the final committed state and deterministically removes it.
  await change([], ["a"]);
  expect(await prisma.shortlistItem.count()).toBe(0);
});
