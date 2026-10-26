/** @jest-environment node */
import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { GET } from "./route";

jest.mock("server-only", () => ({}), { virtual: true });

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@/shared/lib/db/prisma", () => ({ prisma: { shortlist: { findFirst: jest.fn() } } }));
function context(shortlistid = "list-1") {
  return { params: Promise.resolve({ shortlistid }) };
}
beforeEach(() => {
  jest.mocked(prisma.shortlist.findFirst).mockReset();
  jest.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "owner", name: "Traveller", email: "owner@example.test", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: "session", userId: "owner", token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  });
});
it("rejects guests without querying the database", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  const request = new Request("http://localhost/api/shortlists/list-1", { headers: { Cookie: "fixture" } });
  expect((await GET(request, context())).status).toBe(401);
  expect(auth.api.getSession).toHaveBeenCalledWith({ headers: request.headers });
  expect(prisma.shortlist.findFirst).not.toHaveBeenCalled();
});
it("uses the path ID rather than a conflicting query parameter and scopes the owner", async () => {
  const shortlist = {
    id: "list-1",
    userId: "owner",
    shortlistName: "Summer",
    createdAt: new Date("2026-10-15T00:00:00Z"),
    shortlistItems: [{ id: "item-1", shortlistId: "list-1", destinationId: "lisbon-portugal" }],
  };
  jest.mocked(prisma.shortlist.findFirst).mockResolvedValue(shortlist);
  const response = await GET(new Request("http://localhost/api/shortlists/list-1?id=other-list"), context());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  await expect(response.json()).resolves.toEqual({ shortlist: { ...shortlist, createdAt: shortlist.createdAt.toISOString() } });
  expect(prisma.shortlist.findFirst).toHaveBeenCalledWith({ where: { id: "list-1", userId: "owner" }, include: { shortlistItems: true } });
});
it("returns empty shortlists successfully without a query parameter", async () => {
  const shortlist = { id: "list-1", userId: "owner", shortlistName: "Empty", createdAt: new Date(), shortlistItems: [] };
  jest.mocked(prisma.shortlist.findFirst).mockResolvedValue(shortlist);
  const response = await GET(new Request("http://localhost/api/shortlists/list-1"), context());
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toMatchObject({ shortlist: { id: "list-1", shortlistItems: [] } });
});
it("returns 404 when no owned shortlist matches", async () => {
  jest.mocked(prisma.shortlist.findFirst).mockResolvedValue(null);
  const response = await GET(new Request("http://localhost/api/shortlists/missing"), context("missing"));
  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Shortlist not found" });
});
it("does not disguise unexpected database failures as missing records", async () => {
  const error = new Error("Connection unavailable");
  jest.mocked(prisma.shortlist.findFirst).mockRejectedValue(error);
  await expect(GET(new Request("http://localhost/api/shortlists/list-1"), context())).rejects.toBe(error);
});
