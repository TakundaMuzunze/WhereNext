/** @jest-environment node */

import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { POST } from "./route";

// Only authentication is stubbed: the route uses the real generated Prisma client.
jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));

function signIn(id = "alice") {
  jest.mocked(auth.api.getSession).mockResolvedValue({
    user: { id, name: id, email: `${id}@example.test`, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: `session-${id}`, userId: id, token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  });
}
function create(name: string, extra: Record<string, unknown> = {}) {
  return POST(
    new Request("http://localhost/api/shortlists", { method: "POST", body: JSON.stringify({ name, destinationId: "lisbon-portugal", ...extra }) }),
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
  // The runner supplies a fresh, dedicated database; no project data is used.
  await prisma.user.deleteMany();
  await prisma.user.createMany({ data: ["alice", "bob"].map((id) => ({ id, name: id, email: `${id}@example.test` })) });
  signIn();
});
afterAll(async () => {
  await prisma.$disconnect();
});

it("creates a trimmed shortlist and its membership owned by the session user", async () => {
  const response = await create("  Summer  ", { userId: "bob" });
  expect(response.status).toBe(201);
  const lists = await prisma.shortlist.findMany({ include: { shortlistItems: true } });
  expect(lists).toHaveLength(1);
  expect(lists[0]).toMatchObject({ userId: "alice", shortlistName: "Summer", shortlistItems: [{ destinationId: "lisbon-portugal" }] });
  expect(lists[0].shortlistItems[0].shortlistId).toBe(lists[0].id);
  await expect(response.json()).resolves.toMatchObject({ shortlist: { id: lists[0].id, userId: "alice", shortlistName: "Summer" } });
});

it("returns 409 from the actual case-insensitive index without adding partial records", async () => {
  expect((await create("Summer")).status).toBe(201);
  expect((await create(" SUMMER ")).status).toBe(409);
  expect(await prisma.shortlist.count()).toBe(1);
  expect(await prisma.shortlistItem.count()).toBe(1);
});

it("allows different users to use the same name", async () => {
  expect((await create("Summer")).status).toBe(201);
  signIn("bob");
  expect((await create("SUMMER")).status).toBe(201);
  expect(await prisma.shortlist.count()).toBe(2);
  expect(await prisma.shortlistItem.count()).toBe(2);
});

it("allows only one of two concurrent creates for the same owner and name", async () => {
  const responses = await Promise.all([create("Summer"), create("SUMMER")]);
  expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
  expect(await prisma.shortlist.count()).toBe(1);
  expect(await prisma.shortlistItem.count()).toBe(1);
});

it("rolls back the new shortlist if its nested membership insert fails", async () => {
  // A temporary fixture constraint forces a failure AFTER parent creation.
  await prisma.$executeRawUnsafe(`ALTER TABLE "ShortlistItem" ADD CONSTRAINT test_reject_membership CHECK ("destinationId" <> 'lisbon-portugal')`);
  try {
    await expect(create("Rollback example")).rejects.toThrow();
    expect(await prisma.shortlist.count()).toBe(0);
    expect(await prisma.shortlistItem.count()).toBe(0);
  } finally {
    await prisma.$executeRawUnsafe('ALTER TABLE "ShortlistItem" DROP CONSTRAINT test_reject_membership');
  }
});

it("rejects invalid input and guests without persisted records", async () => {
  expect((await create("   ")).status).toBe(400);
  expect((await create("a".repeat(81))).status).toBe(400);
  expect((await create("Summer", { destinationId: "unknown" })).status).toBe(404);
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  expect((await create("Summer")).status).toBe(401);
  expect(await prisma.shortlist.count()).toBe(0);
  expect(await prisma.shortlistItem.count()).toBe(0);
});
