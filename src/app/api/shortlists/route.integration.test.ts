/** @jest-environment node */

import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { DELETE, GET, PATCH, POST } from "./route";
import { GET as getShortlist } from "./[shortlistid]/route";

// Only authentication is stubbed: the route uses the real generated Prisma client.
jest.mock("server-only", () => ({}), { virtual: true });

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

it("reads only the owner's lists, including empty lists and accurate counts", async () => {
  await create("Summer");
  await prisma.shortlist.create({ data: { userId: "alice", shortlistName: "Empty" } });
  signIn("bob");
  await create("Private Bob list");
  signIn();
  const response = await GET(new Request("http://localhost/api/shortlists"));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.userShortlists).toHaveLength(2);
  expect(body.userShortlists).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ userId: "alice", shortlistName: "Summer", _count: { shortlistItems: 1 } }),
      expect.objectContaining({ userId: "alice", shortlistName: "Empty", _count: { shortlistItems: 0 } }),
    ]),
  );
});

function deleteShortlist(shortlistId: string) {
  return DELETE(new Request("http://localhost/api/shortlists", { method: "DELETE", body: JSON.stringify({ shortlistId }) }));
}

it("cannot delete another owner's shortlist or a missing shortlist", async () => {
  await create("Summer");
  const shortlist = await prisma.shortlist.findFirstOrThrow();
  signIn("bob");
  expect((await deleteShortlist(shortlist.id)).status).toBe(404);
  expect((await deleteShortlist("missing")).status).toBe(404);
  expect(await prisma.shortlist.count()).toBe(1);
  expect(await prisma.shortlistItem.count()).toBe(1);
});

it("deletes only the selected list and its memberships, preserving shared destinations elsewhere", async () => {
  await create("Summer");
  const selected = await prisma.shortlist.findFirstOrThrow();
  await create("Winter");
  signIn("bob");
  await create("Summer");
  signIn();
  expect((await deleteShortlist(selected.id)).status).toBe(200);
  expect(await prisma.shortlist.findUnique({ where: { id: selected.id } })).toBeNull();
  expect(await prisma.shortlistItem.count({ where: { shortlistId: selected.id } })).toBe(0);
  expect(await prisma.shortlist.count()).toBe(2);
  expect(await prisma.shortlistItem.count({ where: { destinationId: "lisbon-portugal" } })).toBe(2);
});

it("allows deletion of an empty shortlist", async () => {
  const shortlist = await prisma.shortlist.create({ data: { userId: "alice", shortlistName: "Empty" } });
  expect((await deleteShortlist(shortlist.id)).status).toBe(200);
  expect(await prisma.shortlist.count()).toBe(0);
});

it("renames only an owned list and handles missing lists and case-insensitive conflicts", async () => {
  await create("Summer");
  const shortlist = await prisma.shortlist.findFirstOrThrow();
  await create("Winter");
  function rename(name: string, shortlistId = shortlist.id) {
    return PATCH(new Request("http://localhost/api/shortlists", { method: "PATCH", body: JSON.stringify({ shortlistId, name }) }));
  }
  signIn("bob");
  expect((await rename("Changed by Bob")).status).toBe(404);
  signIn();
  expect((await rename("Changed", "missing")).status).toBe(404);
  expect((await rename(" WINTER ")).status).toBe(409);
  expect(await prisma.shortlist.findUniqueOrThrow({ where: { id: shortlist.id } })).toMatchObject({ shortlistName: "Summer" });
  expect((await rename("  Autumn  ")).status).toBe(200);
  expect(await prisma.shortlist.findUniqueOrThrow({ where: { id: shortlist.id } })).toMatchObject({ shortlistName: "Autumn" });
  expect(await prisma.shortlistItem.count({ where: { shortlistId: shortlist.id } })).toBe(1);
});

it("creates an empty shortlist through POST and rejects case-insensitive duplicates", async () => {
  function empty(name: string) {
    return POST(new Request("http://localhost/api/shortlists", { method: "POST", body: JSON.stringify({ name, userId: "bob" }) }));
  }
  expect((await empty("  Ideas  ")).status).toBe(201);
  expect(await prisma.shortlist.findMany({ include: { shortlistItems: true } })).toEqual([
    expect.objectContaining({ userId: "alice", shortlistName: "Ideas", shortlistItems: [] }),
  ]);
  expect((await empty("IDEAS")).status).toBe(409);
  expect(await prisma.shortlist.count()).toBe(1);
  expect(await prisma.shortlistItem.count()).toBe(0);
});

it.each([null, 123, "", "unknown"])("rejects supplied invalid destinations without creating an empty list: %j", async (destinationId) => {
  expect((await create("Ideas", { destinationId })).status).toBe(typeof destinationId === "string" ? 404 : 400);
  expect(await prisma.shortlist.count()).toBe(0);
  expect(await prisma.shortlistItem.count()).toBe(0);
});

it("reads an owned shortlist and its destination memberships from the path ID", async () => {
  await create("Summer");
  const shortlist = await prisma.shortlist.findFirstOrThrow();
  const response = await getShortlist(new Request(`http://localhost/api/shortlists/${shortlist.id}?id=ignored`), {
    params: Promise.resolve({ shortlistid: shortlist.id }),
  });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({
    shortlist: {
      id: shortlist.id,
      userId: "alice",
      shortlistName: "Summer",
      shortlistItems: [expect.objectContaining({ shortlistId: shortlist.id, destinationId: "lisbon-portugal" })],
    },
  });
});

it("returns an empty membership array for an owned empty shortlist", async () => {
  const shortlist = await prisma.shortlist.create({ data: { userId: "alice", shortlistName: "Empty" } });
  const response = await getShortlist(new Request(`http://localhost/api/shortlists/${shortlist.id}`), {
    params: Promise.resolve({ shortlistid: shortlist.id }),
  });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ shortlist: { id: shortlist.id, shortlistItems: [] } });
});

it("does not reveal another owner's shortlist or distinguish it from a missing one", async () => {
  await create("Private");
  const shortlist = await prisma.shortlist.findFirstOrThrow();
  signIn("bob");
  for (const shortlistid of [shortlist.id, "missing"]) {
    const response = await getShortlist(new Request(`http://localhost/api/shortlists/${shortlistid}`), { params: Promise.resolve({ shortlistid }) });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Shortlist not found" });
  }
});

it("creates a shortlist with the original guide identity when given a verified Wikidata ID", async () => {
  const response = await create("Summer", { destinationId: "wikidata:Q597" });
  expect(response.status).toBe(201);
  const lists = await GET(new Request("http://localhost/api/shortlists"));
  await expect(lists.json()).resolves.toMatchObject({
    userShortlists: [{ shortlistItems: [{ destinationId: "lisbon-portugal" }] }],
  });
});

it("rejects unlinked IDs and guests creating a shortlist from an alias", async () => {
  expect((await create("Summer", { destinationId: "wikidata:Q1000037" })).status).toBe(404);
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  expect((await create("Summer", { destinationId: "wikidata:Q597" })).status).toBe(401);
  expect(await prisma.shortlist.count()).toBe(0);
});
