/** @jest-environment node */
import { POST } from "./route";

it("retires legacy discovery without accepting a request body", async () => {
  const response = await POST();

  expect(response.status).toBe(410);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ status: "retired", plannerUrl: "/planner" });
});
