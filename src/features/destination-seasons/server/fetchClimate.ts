import { z } from "zod";
import { climateLocation, climateObservationSchema, type ClimateObservation } from "../model/climateObservation.ts";

const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const monthlyValues = z.record(z.string(), z.number().nullable());
const responseSchema = z.object({
  geometry: z.object({ coordinates: z.tuple([z.number(), z.number(), z.number()]) }),
  header: z.object({
    api: z.object({ version: z.string().min(1) }),
    sources: z.array(z.string()).refine((sources) => sources.includes("MERRA2")),
    fill_value: z.literal(-999),
    range: z.string().regex(/30-year.*January 1991 - December 2020/),
  }),
  properties: z.object({ parameter: z.object({ T2M: monthlyValues, PRECTOTCORR: monthlyValues }) }),
  parameters: z.object({ T2M: z.object({ units: z.literal("C") }), PRECTOTCORR: z.object({ units: z.literal("mm/day") }) }),
});

export async function fetchClimate(latitude: number, longitude: number): Promise<ClimateObservation> {
  const location = climateLocation(latitude, longitude);
  const url = new URL("https://power.larc.nasa.gov/api/temporal/climatology/point");
  url.search = new URLSearchParams({
    parameters: "T2M,PRECTOTCORR",
    community: "AG",
    longitude: String(location.longitude),
    latitude: String(location.latitude),
    format: "JSON",
    start: "1991",
    end: "2020",
  }).toString();

  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(30000) });

  if (!response.ok) {
    throw new Error("NASA climate retrieval failed.");
  }

  const body = responseSchema.parse(await response.json());
  const [returnedLongitude, returnedLatitude, elevationMetres] = body.geometry.coordinates;

  if (returnedLatitude !== location.latitude || returnedLongitude !== location.longitude) {
    throw new Error("NASA climate coordinates did not match the requested grid cell.");
  }

  function knownValue(value: number | null | undefined): number | null {
    return value === undefined || value === body.header.fill_value ? null : value;
  }

  return climateObservationSchema.parse({
    source: "nasa-power",
    apiVersion: body.header.api.version,
    baselineStart: 1991,
    baselineEnd: 2020,
    latitude: location.latitude,
    longitude: location.longitude,
    elevationMetres,
    retrievedAt: new Date().toISOString(),
    months: monthNames.map((name, index) => ({
      month: index + 1,
      meanTemperatureC: knownValue(body.properties.parameter.T2M[name]),
      precipitationMmPerDay: knownValue(body.properties.parameter.PRECTOTCORR[name]),
    })),
  });
}
