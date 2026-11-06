import { readFileSync } from "node:fs";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || databaseUrl.hostname !== "127.0.0.1" || databaseUrl.pathname !== "/catalogue_test") {
  throw new Error("Climate source fixtures require disposable PostgreSQL.");
}

const fixture = JSON.parse(readFileSync(new URL("./lisbon.json", import.meta.url), "utf8"));
let calls = 0;

globalThis.fetch = async (input) => {
  const url = new URL(String(input));
  if (url.origin !== "https://power.larc.nasa.gov" || url.pathname !== "/api/temporal/climatology/point") {
    throw new Error("Unexpected external request in climate command test.");
  }

  calls++;
  if (process.env.CLIMATE_TEST_FAIL_SECOND === "true" && calls === 2) {
    return new Response("Unavailable", { status: 503 });
  }

  const body = structuredClone(fixture);
  body.geometry.coordinates[0] = Number(url.searchParams.get("longitude"));
  body.geometry.coordinates[1] = Number(url.searchParams.get("latitude"));
  return Response.json(body);
};
