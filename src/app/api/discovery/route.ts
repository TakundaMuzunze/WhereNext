import { discoverDestinations } from "@/features/destination-discovery/server/discoverDestinations";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  // A cross-origin page must not spend the app's provider allowance.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ status: "unavailable" }, { status: 403, headers });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return Response.json({ status: "invalid_request" }, { status: 400, headers });
  }
  const result = await discoverDestinations(input);
  const status = result.status === "invalid_request" ? 400 : result.status === "unavailable" || result.status === "provider_failure" ? 503 : 200;
  return Response.json(result, { status, headers });
}
