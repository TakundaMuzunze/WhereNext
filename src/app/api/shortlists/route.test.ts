/** @jest-environment node */

import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { POST } from "./route";

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@/shared/lib/db/prisma", () => ({ prisma: { shortlist: { create: jest.fn() } } }));

const signedIn = {
  user: { id: "owner", name: "Traveller", email: "owner@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session", userId: "owner", token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
};
const valid = { name: "Summer", destinationId: "lisbon-portugal" };
function request(body: unknown) {
  return new Request("http://localhost/api/shortlists", { method: "POST", body: JSON.stringify(body) });
}

beforeEach(() => {
  jest.mocked(prisma.shortlist.create).mockReset();
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
  { name: "Summer" },
  { destinationId: valid.destinationId },
  { ...valid, name: 1 },
  { ...valid, destinationId: null },
])("rejects an invalid request shape: %j", async (body) => {
  expect((await POST(request(body))).status).toBe(400);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it.each(["", " \t\n ", "a".repeat(81)])("rejects an invalid name: %j", async (name) => {
  expect((await POST(request({ ...valid, name }))).status).toBe(400);
  expect(prisma.shortlist.create).not.toHaveBeenCalled();
});

it("rejects unknown destinations", async () => {
  expect((await POST(request({ ...valid, destinationId: "unknown" }))).status).toBe(404);
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
  await expect(response.json()).resolves.toEqual({ error: "A conflicting shortlist record already exists" });
});

it.each([
  new Error("Connection unavailable"),
  new Prisma.PrismaClientKnownRequestError("Foreign key failed", { code: "P2003", clientVersion: "7.10.0" }),
  { code: "P2002" },
])("does not disguise unexpected failures as uniqueness conflicts", async (error) => {
  jest.mocked(prisma.shortlist.create).mockRejectedValue(error);
  await expect(POST(request(valid))).rejects.toBe(error);
});
