import type { TripType } from "@/entities/trip/model/types";

export type DestinationCostLevel = "budget" | "mid-range" | "premium";

export type DestinationGuideItem = {
  title: string;
  description: string;
};

export type DestinationGuide = {
  bestFor: string[];
  watchOutFor: string[];
  itineraryIdeas: DestinationGuideItem[];
  travelTips: DestinationGuideItem[];
};

export type Destination = {
  id: string;
  name: string;
  country: string;
  description: string;
  image: {
    src: string;
    alt: string;
  };
  estimatedCostPerPerson: number;
  costLevel: DestinationCostLevel;
  bestMonths: string[];
  tripTypes: TripType[];
  activities: string[];
  recommendedDuration: {
    min: number;
    max: number;
  };
  guide: DestinationGuide;
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
