import { initialActivities } from "@/features/destination-activities/lib/activityCategories";
import { sightseeingInterests } from "@/features/destination-seasons/lib/assessSeason";

// Offer only preferences with an existing activity or climate assessment rule.
export const interestGroups = [
  {
    name: "Nearby activities",
    description:
      "Look for named museums, beaches, bars, nightclubs and markets nearby. Listings do not verify quality, opening or access. Beaches also inform climate preferences.",
    interests: initialActivities,
  },
  {
    name: "Sightseeing climate",
    description:
      "Compare historical temperature and rainfall for outdoor sightseeing. These preferences assess climate only; they do not verify tours, buildings or historic attractions.",
    interests: [...sightseeingInterests],
  },
];
