/** @jest-environment node */
import { POST } from "./route";
import { discoverDestinations } from "@/features/destination-discovery/server/discoverDestinations";
jest.mock("@/features/destination-discovery/server/discoverDestinations", () => ({ discoverDestinations: jest.fn() }));
it("blocks cross-origin spending before contacting providers", async () => {
  const response = await POST(
    new Request("https://where-next.test/api/discovery", { method: "POST", headers: { origin: "https://other.test" }, body: "{}" }),
  );
  expect(response.status).toBe(403);
  expect(discoverDestinations).not.toHaveBeenCalled();
});
it("rejects malformed JSON", async () => {
  const response = await POST(new Request("https://where-next.test/api/discovery", { method: "POST", body: "{" }));
  expect(response.status).toBe(400);
});
it("returns uncached results from the validated discovery service", async () => {
  jest.mocked(discoverDestinations).mockResolvedValue({ status: "empty" });
  const response = await POST(new Request("https://where-next.test/api/discovery", { method: "POST", body: "{}" }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ status: "empty" });
});
