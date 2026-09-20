import type { TripType } from "@/entities/trip/model/types";

type TripTypeOption = {
  value: TripType;
  label: string;
  description: string;
  activities: string[];
};

export const tripTypes: TripTypeOption[] = [
  {
    value: "baecation",
    label: "Baecation",
    description: "Romantic restaurants, views, beaches and quality time.",
    activities: ["Romantic dinners", "Sunset views", "Beach clubs", "Spa days", "Luxury stays"],
  },
  {
    value: "city-break",
    label: "City break",
    description: "Walkable cities, culture, food, shopping and nightlife.",
    activities: ["Museums", "Shopping", "Food markets", "Architecture", "Cocktail bars"],
  },
  {
    value: "beach-holiday",
    label: "Beach holiday",
    description: "Sun, sea, relaxing days and easy evenings.",
    activities: ["Beaches", "Boat trips", "Beach clubs", "Swimming", "Island hopping"],
  },
  {
    value: "adventure",
    label: "Adventure",
    description: "Nature, exploring, hidden gems and active days.",
    activities: ["Hiking", "Waterfalls", "Road trips", "Nature parks", "Hidden gems"],
  },
  {
    value: "foodie",
    label: "Foodie trip",
    description: "Restaurants, local dishes, markets and food-led exploring.",
    activities: ["Street food", "Local restaurants", "Food tours", "Markets", "Cooking classes"],
  },
  {
    value: "nightlife",
    label: "Nightlife",
    description: "Bars, clubs, beach parties and late nights.",
    activities: ["Bars", "Clubs", "Beach parties", "Live music", "Rooftop drinks"],
  },
  {
    value: "relaxing",
    label: "Relaxing escape",
    description: "Slow mornings, spa days, calm beaches and peaceful stays.",
    activities: ["Spa days", "Quiet beaches", "Resorts", "Scenic views", "Pool days"],
  },
  {
    value: "culture",
    label: "Culture & history",
    description: "Historic cities, museums, architecture and local experiences.",
    activities: ["Historic sites", "Museums", "Walking tours", "Old towns", "Local culture"],
  },
];
