import { z } from "zod";

// Departure airports currently supported by travel planning.
export const departureAirportSchema = z.enum(["LHR", "MAN"]);
export const departureAirportNames = { LHR: "London Heathrow", MAN: "Manchester" };

export type DepartureAirportCode = z.infer<typeof departureAirportSchema>;

export function departureAirportLabel(code?: DepartureAirportCode): string {
  return code ? `${departureAirportNames[code]} (${code})` : "Not chosen yet";
}
