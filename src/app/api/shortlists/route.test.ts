/** @jest-environment node */

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { DELETE, GET, PATCH, POST } from "./route";

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@/shared/lib/db/prisma", () => ({
  prisma: { shortlist: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn(), update: jest.fn() } },
}));

const signedIn = {
  user: { id: "owner", name: "Traveller", email: "owner@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session", userId: "owner", token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
};
const valid = { name: "Summer", destinationId: "lisbon-portugal" };
function request(body: unknown) {
  return new Request("http://localhost/api/shortlists", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  jest.mocked(prisma.shortlist.update).mockReset();
  jest.mocked(prisma.shortlist.create).mockReset();
  jest.mocked(prisma.shortlist.findMany).mockReset();
  jest.mocked(prisma.shortlist.deleteMany).mockReset();
  jest.mocked(auth.api.getSession).mockResolvedValue(signedIn);
});

it("rejects guests before parsing the body or writing", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  const incoming = new Request("http://localhost/api/shortlists", { method: "POST", headers: { Cookie: "fixture" }, body: "invalid JSON" });
  const response = await POST(incoming);
  expect(response.status).toBe(401);
  expect(auth.api.getSession).toHaveBeenCalledWith({ headers: incoming.headers });
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it("rejects malformed JSON", async () => {
  const response = await POST(new Request("http://localhost/api/shortlists", { method: "POST", body: "{" }));
  expect(response.status).toBe(400);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it.each([
  null,
  [],
  "text",
  12,
  {},
  { destinationId: valid.destinationId },
  { ...valid, name: 1 },
  { ...valid, destinationId: null },
  { ...valid, destinationId: 123 },
])("rejects an invalid request shape: %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it.each(["", " \t\n ", "a".repeat(81)])("rejects an invalid name: %j", async (name) => {
  expect((await POST(request({ ...valid, name }))).status).toBe(400);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it.each(["unknown", "", "  "])("rejects invalid destination IDs: %j", async (destinationId) => {
  expect((await POST(request({ ...valid, destinationId }))).status).toBe(404);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it.each(["A", "a".repeat(80)])("accepts a trimmed name at the length boundary", async (name) => {
  const created = { id: "new-list", userId: "owner", shortlistName: name, createdAt: new Date("2026-10-15T00:00:00Z") };
  jest.mocked(prisma.shortlist.create).mockResolvedValue(created);
  const response = await POST(request({ ...valid, name: `  ${name}  `, userId: "someone-else" }));
  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toEqual({ shortlist: { ...created, createdAt: created.createdAt.toISOString() } });
  expect(prisma.shortlist.create).toHaveBeenCalledWith({
    data: {
      userId: "owner",
      shortlistName: name,
      shortlistItems: { create: { destinationId: valid.destinationId } },
    },
  });
});

it("returns a conflict for a Prisma uniqueness error", async () => {
  jest
    .mocked(prisma.shortlist.create)
    .mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "7.10.0" }));
  const response = await POST(request(valid));
  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({ error: "A shortlist with that name already exists" });
});

it.each([
  new Error("Connection unavailable"),
  new Prisma.PrismaClientKnownRequestError("Foreign key failed", { code: "P2003", clientVersion: "7.10.0" }),
  { code: "P2002" },
])("does not disguise unexpected failures as uniqueness conflicts", async (error) => {
  jest.mocked(prisma.shortlist.create).mockRejectedValue(error);
  await expect(POST(request(valid))).rejects.toBe(error);
});

describe("GET", () => {
  it("rejects guests without querying shortlists", async () => {
    jest.mocked(auth.api.getSession).mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/shortlists"))).status).toBe(401);
    expect(prisma.shortlist.findMany).not.toHaveBeenCalled();
  });

  it("returns an empty array when the owner has no shortlists", async () => {
    jest.mocked(prisma.shortlist.findMany).mockResolvedValue([]);
    const response = await GET(new Request("http://localhost/api/shortlists"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    await expect(response.json()).resolves.toEqual({ userShortlists: [] });
    expect(prisma.shortlist.findMany).toHaveBeenCalledWith({
      where: { userId: "owner" },
      include: { _count: { select: { shortlistItems: true } }, shortlistItems: { select: { destinationId: true } } },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
  });
});

describe("DELETE", () => {
  function deletion(body: unknown) {
    return new Request("http://localhost/api/shortlists", { method: "DELETE", body: JSON.stringify(body) });
  }

  it("rejects guests before parsing or deleting", async () => {
    jest.mocked(auth.api.getSession).mockResolvedValue(null);
    expect((await DELETE(new Request("http://localhost/api/shortlists", { method: "DELETE", body: "{" }))).status).toBe(401);
    expect(prisma.shortlist.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    expect((await DELETE(new Request("http://localhost/api/shortlists", { method: "DELETE", body: "{" }))).status).toBe(400);
    expect(prisma.shortlist.deleteMany).not.toHaveBeenCalled();
  });

  it.each([null, [], "text", {}, { name: "Summer" }, { shortlistId: 1 }, { shortlistId: "" }, { shortlistId: "  " }])(
    "rejects an invalid shortlist ID: %j",
    async (body) => {
      expect((await DELETE(deletion(body))).status).toBe(400);
      expect(prisma.shortlist.deleteMany).not.toHaveBeenCalled();
    },
  );

  it("deletes using the ID and session owner without requiring a destination", async () => {
    jest.mocked(prisma.shortlist.deleteMany).mockResolvedValue({ count: 1 });
    const response = await DELETE(deletion({ shortlistId: "list-1", userId: "someone-else" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ shortlistId: "list-1" });
    expect(prisma.shortlist.deleteMany).toHaveBeenCalledWith({ where: { userId: "owner", id: "list-1" } });
  });

  it("returns 404 when no owned shortlist was deleted", async () => {
    jest.mocked(prisma.shortlist.deleteMany).mockResolvedValue({ count: 0 });
    const response = await DELETE(deletion({ shortlistId: "missing-or-not-owned" }));
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Shortlist not found" });
  });
});

describe("PATCH", () => {
  function rename(body: unknown) {
    return PATCH(new Request("http://localhost/api/shortlists", { method: "PATCH", body: JSON.stringify(body) }));
  }

  it("rejects guests before parsing or updating", async () => {
    jest.mocked(auth.api.getSession).mockResolvedValue(null);
    expect((await PATCH(new Request("http://localhost/api/shortlists", { method: "PATCH", body: "{" }))).status).toBe(401);
    expect(prisma.shortlist.update).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    expect((await PATCH(new Request("http://localhost/api/shortlists", { method: "PATCH", body: "{" }))).status).toBe(400);
    expect(prisma.shortlist.update).not.toHaveBeenCalled();
  });

  it.each([
    null,
    [],
    {},
    { shortlistId: "list-1" },
    { name: "Summer" },
    { shortlistId: 1, name: "Summer" },
    { shortlistId: "list-1", name: 1 },
    { shortlistId: "", name: "Summer" },
    { shortlistId: "  ", name: "Summer" },
    { shortlistId: "list-1", name: "" },
    { shortlistId: "list-1", name: "  " },
    { shortlistId: "list-1", name: "a".repeat(81) },
  ])("rejects invalid input: %j", async (body) => {
    expect((await rename(body)).status).toBe(400);
    expect(prisma.shortlist.update).not.toHaveBeenCalled();
  });

  it.each(["A", "a".repeat(80)])("renames an owned shortlist using the trimmed name at the length boundary", async (name) => {
    const updatedShortlist = { id: "list-1", userId: "owner", shortlistName: name, createdAt: new Date("2026-10-15T00:00:00Z") };
    jest.mocked(prisma.shortlist.update).mockResolvedValue(updatedShortlist);
    const response = await rename({ shortlistId: "list-1", name: `  ${name}  `, userId: "someone-else" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      updatedShortlist: { ...updatedShortlist, createdAt: updatedShortlist.createdAt.toISOString() },
    });
    expect(prisma.shortlist.update).toHaveBeenCalledWith({ where: { userId: "owner", id: "list-1" }, data: { shortlistName: name } });
  });

  it.each([
    ["P2002", 409],
    ["P2025", 404],
  ] as const)("maps %s to %s", async (code, status) => {
    jest.mocked(prisma.shortlist.update).mockRejectedValue(new Prisma.PrismaClientKnownRequestError("fixture", { code, clientVersion: "7.10.0" }));
    expect((await rename({ shortlistId: "list-1", name: "Summer" })).status).toBe(status);
  });

  it("rethrows unexpected database failures", async () => {
    const error = new Error("Connection unavailable");
    jest.mocked(prisma.shortlist.update).mockRejectedValue(error);
    await expect(rename({ shortlistId: "list-1", name: "Summer" })).rejects.toBe(error);
  });
});

it("creates an empty shortlist when destinationId is omitted", async () => {
  const created = { id: "empty-list", userId: "owner", shortlistName: "Ideas", createdAt: new Date("2026-10-15T00:00:00Z") };
  jest.mocked(prisma.shortlist.create).mockResolvedValue(created);
  const response = await POST(request({ name: "  Ideas  ", userId: "someone-else" }));
  expect(response.status).toBe(201);
  await expect(response.json()).resolves.toEqual({ shortlist: { ...created, createdAt: created.createdAt.toISOString() } });
  expect(prisma.shortlist.create).toHaveBeenCalledWith({ data: { userId: "owner", shortlistName: "Ideas" } });
});

it.each(["", "  ", "a".repeat(81)])("rejects invalid names without a destination: %j", async (name) => {
  expect((await POST(request({ name }))).status).toBe(400);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});
