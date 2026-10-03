/** @jest-environment node */
import { getSavedDestinations, removeDestination, saveDestination } from "./saveDestinations";

afterEach(() => jest.restoreAllMocks());

it("posts only the destination ID and accepts success without parsing a body", async () => {
  const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
  await expect(saveDestination("lisbon-portugal")).resolves.toBe("saved");
  expect(fetchMock).toHaveBeenCalledWith("/api/saved-destinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinationId: "lisbon-portugal" }),
  });
});

it("distinguishes an expired session from other failures", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
  await expect(saveDestination("lisbon-portugal")).resolves.toBe("unauthorised");
});

it("rejects server errors", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));
  await expect(saveDestination("lisbon-portugal")).rejects.toThrow("Failed to save destination");
});

it("loads destination IDs in server order", async () => {
  jest
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json({ savedUserDestinations: [{ destinationId: "lisbon-portugal" }, { destinationId: "split-croatia" }] }));
  await expect(getSavedDestinations()).resolves.toEqual(["lisbon-portugal", "split-croatia"]);
});
it("rejects malformed list responses", async () => {
  jest.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ savedUserDestinations: [{ destinationId: 123 }] }));
  await expect(getSavedDestinations()).rejects.toThrow("Invalid saved destination");
});
it("sends DELETE and distinguishes expired sessions", async () => {
  const request = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
  await expect(removeDestination("lisbon-portugal")).resolves.toBe("unauthorised");
  expect(request).toHaveBeenCalledWith("/api/saved-destinations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinationId: "lisbon-portugal" }),
  });
});
