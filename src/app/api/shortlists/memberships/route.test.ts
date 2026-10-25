/** @jest-environment node */
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { PATCH } from "./route";

jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@/shared/lib/db/prisma", () => ({ prisma: { $transaction: jest.fn() } }));
const valid = { destinationId: "lisbon-portugal", addTo: ["list-1"], removeFrom: [] };
function change(body: unknown) {
  return PATCH(new Request("http://localhost/api/shortlists/memberships", { method: "PATCH", body: JSON.stringify(body) }));
}
beforeEach(() => {
  jest.mocked(prisma.$transaction).mockReset();
  jest.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "alice", name: "Alice", email: "alice@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: "session", userId: "alice", token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  });
});
it("rejects guests before parsing or querying", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  expect((await PATCH(new Request("http://localhost/api/shortlists/memberships", { method: "PATCH", body: "{" }))).status).toBe(401);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it("rejects malformed JSON", async () => {
  expect((await PATCH(new Request("http://localhost/api/shortlists/memberships", { method: "PATCH", body: "{" }))).status).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it.each([
  null,
  [],
  {},
  { ...valid, destinationId: null },
  { ...valid, addTo: null },
  { ...valid, removeFrom: "list-2" },
  { ...valid, addTo: [1] },
  { ...valid, removeFrom: [" "] },
  { ...valid, addTo: [""] },
  { ...valid, removeFrom: ["list-1"] },
])("rejects invalid payloads: %j", async (body) => {
  expect((await change(body)).status).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it("rejects unknown destinations before opening a transaction", async () => {
  expect((await change({ ...valid, destinationId: "unknown" })).status).toBe(404);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
function databaseError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("fixture", { code, clientVersion: "7.10.0" });
}
it("retries serialization failures and derives saved state from the result", async () => {
  jest
    .mocked(prisma.$transaction)
    .mockRejectedValueOnce(databaseError("P2034"))
    .mockResolvedValueOnce({ shortlistIds: ["list-1"] });
  const response = await change(valid);
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ destinationId: valid.destinationId, shortlistIds: ["list-1"], isSaved: true });
  expect(prisma.$transaction).toHaveBeenCalledTimes(2);
});
it("stops after three serialization failures", async () => {
  jest.mocked(prisma.$transaction).mockRejectedValue(databaseError("P2034"));
  expect((await change(valid)).status).toBe(409);
  expect(prisma.$transaction).toHaveBeenCalledTimes(3);
});
it("returns 404 if a referenced shortlist disappears during insertion", async () => {
  jest.mocked(prisma.$transaction).mockRejectedValue(databaseError("P2003"));
  expect((await change(valid)).status).toBe(404);
});
it("rethrows unexpected failures", async () => {
  const error = new Error("Connection unavailable");
  jest.mocked(prisma.$transaction).mockRejectedValue(error);
  await expect(change(valid)).rejects.toBe(error);
});

it.each([null, 42, "", "  ", "a".repeat(81)])("rejects an invalid picker-created name: %j", async (createName) => {
  expect((await change({ ...valid, createName })).status).toBe(400);
  expect(prisma.$transaction).not.toHaveBeenCalled();
});
it("returns a name conflict without reporting a successful save", async () => {
  jest.mocked(prisma.$transaction).mockRejectedValue(databaseError("P2002"));
  const response = await change({ ...valid, createName: "Summer" });
  expect(response.status).toBe(409);
  await expect(response.json()).resolves.toEqual({ error: "A shortlist with that name already exists" });
});
