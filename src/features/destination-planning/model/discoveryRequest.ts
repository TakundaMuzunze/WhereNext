import { z } from "zod";
import { departureAirportSchema } from "@/entities/trip/model/departureAirport";
import { tripTypes } from "@/shared/data/tripTypes";

export const discoveryInterests = [...new Set(tripTypes.flatMap((tripType) => tripType.activities))];

const interestSchema = z.string().refine((interest) => discoveryInterests.includes(interest), "Choose an offered interest.");

const timingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("flexible") }),
  z.strictObject({ kind: z.literal("month"), month: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/) }),
  z.strictObject({ kind: z.literal("exact"), outboundDate: z.iso.date(), returnDate: z.iso.date() }),
]);

export function nightsBetween(outboundDate: string, returnDate: string): number {
  const outboundTime = Date.parse(`${outboundDate}T00:00:00Z`);
  const returnTime = Date.parse(`${returnDate}T00:00:00Z`);

  return (returnTime - outboundTime) / 86_400_000;
}

export const discoveryRequestSchema = z
  .strictObject({
    kind: z.literal("discovery"),
    departureAirportCode: departureAirportSchema.optional(),
    timing: timingSchema,
    approximateNights: z.number().int().min(1).max(28),
    adultCount: z.number().int().min(1).max(9),
    groupBudgetPence: z.number().int().min(100).max(10_000_000),
    activities: z
      .array(interestSchema)
      .min(1)
      .max(10)
      .transform((interests) => [...new Set(interests)]),
  })
  .superRefine((request, context) => {
    if (request.timing.kind !== "exact") {
      return;
    }

    const nights = nightsBetween(request.timing.outboundDate, request.timing.returnDate);

    if (nights !== request.approximateNights) {
      context.addIssue({ code: "custom", path: ["approximateNights"], message: "Duration must match your dates." });
    }
  });

export type DiscoveryRequest = z.infer<typeof discoveryRequestSchema>;
