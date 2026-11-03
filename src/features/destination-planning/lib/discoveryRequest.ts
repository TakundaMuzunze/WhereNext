import { discoveryRequestSchema, nightsBetween, type DiscoveryRequest } from "../model/discoveryRequest";
import type { PlannerSearchParams } from "@/features/trip-planner";

export function parseDiscoveryRequest(query: PlannerSearchParams): DiscoveryRequest | null {
  const scalarFields = ["kind", "timing", "nights", "adults", "budget", "month", "outbound", "return"];

  if (scalarFields.some((field) => Array.isArray(query[field]))) {
    return null;
  }

  let timing: unknown = { kind: query.timing };
  let approximateNights = Number(query.nights);

  if (query.timing === "month") {
    timing = { kind: "month", month: query.month };
  }

  if (query.timing === "exact") {
    timing = { kind: "exact", outboundDate: query.outbound, returnDate: query.return };
    approximateNights = nightsBetween(String(query.outbound), String(query.return));
  }

  const activities = Array.isArray(query.activity) ? query.activity : [query.activity];
  const validation = discoveryRequestSchema.safeParse({
    kind: query.kind,
    timing,
    approximateNights,
    adultCount: Number(query.adults),
    groupBudgetPence: Number(query.budget),
    activities,
  });

  if (!validation.success) {
    return null;
  }

  return validation.data;
}

export function serializeDiscoveryRequest(request: DiscoveryRequest): string {
  const query = new URLSearchParams({
    kind: request.kind,
    timing: request.timing.kind,
    nights: String(request.approximateNights),
    adults: String(request.adultCount),
    budget: String(request.groupBudgetPence),
  });

  if (request.timing.kind === "month") {
    query.set("month", request.timing.month);
  }

  if (request.timing.kind === "exact") {
    query.set("outbound", request.timing.outboundDate);
    query.set("return", request.timing.returnDate);
  }

  for (const activity of request.activities) {
    query.append("activity", activity);
  }

  return query.toString();
}
