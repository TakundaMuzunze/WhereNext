export type TripType = "baecation" | "city-break" | "beach-holiday" | "adventure" | "foodie" | "nightlife" | "relaxing" | "culture";

export type PlannerAnswers = {
  departure: string;
  travelMonth: string;
  duration: string;
  budget: string;
  travellers: string;
  tripType: TripType | "";
  activities: string[];
};
