import { z } from "zod";

export const climateMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  meanTemperatureC: z.number().min(-100).max(70).nullable(),
  precipitationMmPerDay: z.number().min(0).max(1000).nullable(),
});

export const climateObservationSchema = z.object({
  source: z.literal("nasa-power"),
  apiVersion: z.string().min(1).max(40),
  baselineStart: z.literal(1991),
  baselineEnd: z.literal(2020),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  elevationMetres: z.number().finite(),
  retrievedAt: z.iso.datetime(),
  months: z
    .array(climateMonthSchema)
    .length(12)
    .refine((months) => new Set(months.map((month) => month.month)).size === 12),
});

export type ClimateObservation = z.infer<typeof climateObservationSchema>;
export type ClimateMonth = z.infer<typeof climateMonthSchema>;

// MERRA-2 meteorology uses a 0.5° latitude / 0.625° longitude grid.
// Nearby catalogue destinations share a single stored request rather than duplicating NASA calls.
export function climateLocation(latitude: number, longitude: number) {
  const coordinates = z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse({ latitude, longitude });
  const gridLatitude = Math.round(coordinates.latitude / 0.5) * 0.5;
  let gridLongitude = Math.round(coordinates.longitude / 0.625) * 0.625;

  if (gridLongitude === 180) {
    gridLongitude = -180;
  }

  return {
    latitude: gridLatitude,
    longitude: gridLongitude,
    requestKey: `nasa-power:merra2:1991-2020:v1:${gridLatitude}:${gridLongitude}`,
  };
}
