/** @jest-environment node */

import { auth } from "@/shared/lib/auth/auth";
import { prisma } from "@/shared/lib/db/prisma";
import { GET, DELETE, POST } from "./route";

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("@/shared/lib/db/prisma", () => ({ prisma: { savedDestination: { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() } } }));

it("forwards headers as an own property for Better Auth's context copying", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  const request = new Request("http://localhost:3000/api/saved-destinations", {
    method: "POST",
    headers: { Cookie: "test-session=fixture" },
  });

  const response = await POST(request);
  const options = jest.mocked(auth.api.getSession).mock.calls[0][0];

  // Better Auth spreads its options; Request.headers is an inherited getter.
  expect(Object.prototype.hasOwnProperty.call(options, "headers")).toBe(true);
  expect(options?.headers).toBe(request.headers);
  expect(response.status).toBe(401);
  expect(prisma.savedDestination.upsert).not.toHaveBeenCalled();
});

it("rejects an unknown destination without writing to the database", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue({
    user: {
      id: "user-1",
      name: "Test Traveller",
      email: "test@example.com",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    session: {
      id: "session-1",
      userId: "user-1",
      token: "test-token",
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const request = new Request("http://localhost:3000/api/saved-destinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinationId: "made-up-destination" }),
  });

  const response = await POST(request);

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: "Destination doesn't exist" });
  expect(prisma.savedDestination.upsert).not.toHaveBeenCalled();
});

const signedIn = {
  user: { id: "owner", name: "Traveller", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
  session: { id: "session", userId: "owner", token: "fixture", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
};

it("reads only the current user's saves in newest-first order", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(signedIn);
  jest.mocked(prisma.savedDestination.findMany).mockResolvedValue([]);
  const response = await GET(new Request("http://localhost/api/saved-destinations?userId=someone-else"));
  expect(prisma.savedDestination.findMany).toHaveBeenCalledWith({ where: { userId: "owner" }, orderBy: { createdAt: "desc" } });
  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual({ savedUserDestinations: [] });
});

it("treats an already-removed destination as success and enforces ownership", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(signedIn);
  jest.mocked(prisma.savedDestination.deleteMany).mockResolvedValue({ count: 0 });
  const response = await DELETE(
    new Request("http://localhost/api/saved-destinations", {
      method: "DELETE",
      body: JSON.stringify({ destinationId: "lisbon-portugal", userId: "someone-else" }),
    }),
  );
  expect(prisma.savedDestination.deleteMany).toHaveBeenCalledWith({ where: { userId: "owner", destinationId: "lisbon-portugal" } });
  expect(response.status).toBe(200);
});

it.each([GET, DELETE])("rejects unauthenticated requests without accessing saved records", async (handler) => {
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  const response = await handler(new Request("http://localhost/api/saved-destinations"));
  expect(response.status).toBe(401);
  expect(prisma.savedDestination.findMany).not.toHaveBeenCalled();
  expect(prisma.savedDestination.deleteMany).not.toHaveBeenCalled();
});
