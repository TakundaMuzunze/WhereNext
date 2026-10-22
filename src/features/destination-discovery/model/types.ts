export type DiscoveredFlightOption = {
  destination: {
    providerId: string;
    name: string;
    country: string;
  };
  servingAirportCode: string;
  departureAirportCode: string;
  outboundDate: string;
  returnDate: string;
  currency: "GBP";
  price: {
    amountPence: number;
    basis: "per_adult" | "total_party";
    adultCount: number;
  };
  durationMinutes: number;
  stops: number;
  retrievedAt: string;
  providerProcessedAt: string;
  onwardUrl: string;
};

export type FlightSearchResult =
  | { status: "success"; options: DiscoveredFlightOption[] }
  | { status: "empty" }
  | { status: "invalid_request" }
  | { status: "duplicate"; retryAt: string }
  | { status: "unavailable" }
  | { status: "provider_failure" };
