import type { TripType } from "@/entities/trip/model/types";

export type DestinationCostLevel = "budget" | "mid-range" | "premium";

export type Destination = {
  id: string;
  name: string;
  country: string;
  description: string;
  estimatedCostPerPerson: number;
  costLevel: DestinationCostLevel;
  bestMonths: string[];
  tripTypes: TripType[];
  activities: string[];
  recommendedDuration: {
    min: number;
    max: number;
  };
};

export type DestinationScoreBreakdown = {
  budget: number;
  travelMonth: number;
  tripType: number;
  activities: number;
  duration: number;
};

export type DestinationRecommendation = {
  destination: Destination;
  score: number;
  breakdown: DestinationScoreBreakdown;
  reasons: string[];
};
