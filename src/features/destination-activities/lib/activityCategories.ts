export const initialActivities = ["Museums", "Beaches", "Bars", "Clubs", "Markets"];

const categories = new Map<string, string>([
  ["Museums", "entertainment.museum"],
  ["Beaches", "beach"],
  ["Bars", "catering.bar"],
  ["Clubs", "adult.nightclub"],
  ["Markets", "commercial.marketplace"],
]);

export function activityCategory(activity: string): string | undefined {
  return categories.get(activity);
}
