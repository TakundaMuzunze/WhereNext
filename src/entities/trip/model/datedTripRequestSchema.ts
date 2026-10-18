import { z } from "zod";
import { tripTypes } from "@/shared/data/tripTypes";

const millisecondsPerDay = 86_400_000;

// Use UTC to avoid daylight-saving issues when calculating trip duration.
function calendarDay(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) / millisecondsPerDay;
}

const preferencesSchema = z
  .strictObject({
    tripType: z.enum(tripTypes.map(({ value }) => value)),
    activities: z.array(z.string()).min(1, "Choose at least one activity."),
  })
  .superRefine((preferences, context) => {
    const selectedTripType = tripTypes.find(({ value }) => value === preferences.tripType);

    const allowedActivities = selectedTripType?.activities ?? [];

    preferences.activities.forEach((activity, index) => {
      if (!allowedActivities.includes(activity)) {
        context.addIssue({
          code: "custom",
          path: ["activities", index],
          message: "Choose an activity offered for this trip type.",
        });
      }
    });
  })
  .transform((preferences) => {
    const uniqueActivities = [...new Set(preferences.activities)];

    return {
      ...preferences,
      activities: uniqueActivities,
    };
  });

const datedTripRequestFieldsSchema = z.strictObject({
  kind: z.literal("dated"),
  departureAirportCode: z.enum(["LHR", "MAN"]),
  currency: z.literal("GBP"),
  adultCount: z.number().int().min(1).max(9),
  groupBudgetPence: z.number().int().min(100).max(10_000_000),
  dailyAllowancePerPersonPence: z.number().int().min(0).max(100_000),
  outboundDate: z.iso.date(),
  returnDate: z.iso.date(),
  preferences: preferencesSchema,
});

// Pass today's date into the schema so validation stays current and is easy to test.
export function createDatedTripRequestSchema(today: string) {
  const todayDay = calendarDay(z.iso.date().parse(today));

  return datedTripRequestFieldsSchema.superRefine((request, context) => {
    const isOutboundValid = z.iso.date().safeParse(request.outboundDate).success;
    const isReturnValid = z.iso.date().safeParse(request.returnDate).success;

    if (!isOutboundValid || !isReturnValid) {
      return;
    }

    const outboundDay = calendarDay(request.outboundDate);
    const nights = calendarDay(request.returnDate) - outboundDay;

    if (outboundDay < todayDay || outboundDay > todayDay + 365) {
      context.addIssue({
        code: "custom",
        path: ["outboundDate"],
        message: "Choose a departure date from today through the next 365 days.",
      });
    }

    if (nights < 1 || nights > 28) {
      context.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Choose a return date between 1 and 28 nights after departure.",
      });
    }
  });
}

type DatedTripSchema = ReturnType<typeof createDatedTripRequestSchema>;

export type DatedTripRequest = z.infer<DatedTripSchema>;
export type DepartureAirportCode = DatedTripRequest["departureAirportCode"];
