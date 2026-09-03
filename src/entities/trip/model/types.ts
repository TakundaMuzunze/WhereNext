export type TripType = "baecation" | "city-break" | "beach-holiday" | "adventure" | "foodie" | "nightlife" | "relaxing" | "culture";

export type PlannerAnswers = {
  departure: string;
  travelMonth: string;
  duration: number | "";
  budget: number | "";
  travellers: number | "";
  tripType: TripType | "";
  activities: string[];
};
