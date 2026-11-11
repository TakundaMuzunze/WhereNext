// Netlify enforces the exported rule before forwarding allowed requests to Next.js.
export default function activityRateLimit(): void {
  return;
}

export const config = {
  // Netlify may route repeated-slash aliases without redirecting to the canonical API path.
  path: "/*/activities",
  method: "POST",
  rateLimit: {
    action: "rate_limit",
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
