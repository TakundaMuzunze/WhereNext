const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || database.hostname !== "127.0.0.1" || database.pathname !== "/catalogue_test") {
  throw new Error("Activity fixtures require the disposable catalogue database.");
}

globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.origin !== "https://api.geoapify.com" || url.pathname !== "/v2/places" || url.searchParams.get("limit") !== "20") {
    throw new Error("Unexpected fixture request");
  }
  const failure = process.env.ACTIVITY_TEST_FAILURE;
  if (failure === "database") {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE application_name = 'where-next-activity-enrichment'");
    } finally {
      await pool.end();
    }
  }
  if (failure === "network") throw new Error("Fixture outage");
  if (failure === "body_network")
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new TypeError("Fixture stream disconnected"));
        },
      }),
    );
  if (failure === "malformed") return Response.json({ invalid: true });
  if (failure === "throttled") return new Response(null, { status: 429 });
  if (failure === "credentials") return new Response(null, { status: 403 });
  const [, longitude, latitude] = url.searchParams.get("filter").split(":").join(",").split(",");
  const category = url.searchParams.get("categories");
  return Response.json({
    features: [
      {
        properties: {
          place_id: "fixture-place",
          name: "Fixture named place",
          categories: [category],
          lat: Number(latitude),
          lon: Number(longitude),
        },
      },
    ],
  });
};
import { Pool } from "pg";
