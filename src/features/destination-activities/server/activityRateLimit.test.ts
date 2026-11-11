/** @jest-environment node */
import { config } from "../../../../netlify/edge-functions/activity-rate-limit";

it("limits activity POST requests by client network and domain without limiting navigation or saving", () => {
  expect(config.path).toBe("/*/activities");
  expect(config.method).toBe("POST");
  expect(config.rateLimit).toEqual({
    action: "rate_limit",
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  });
});
