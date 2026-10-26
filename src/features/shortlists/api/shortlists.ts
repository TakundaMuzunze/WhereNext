import type { DestinationSummary } from "@/entities/destination/model/importedDestination";

export type Shortlist = { id: string; name: string; destinationIds: string[]; destinationSummaries?: DestinationSummary[] };
export type MembershipChange = { destinationId: string; addTo: string[]; removeFrom: string[]; createName?: string };
export type MembershipResult = { destinationId: string; shortlistIds: string[]; createdShortlist?: Shortlist; destination?: DestinationSummary };

export class ShortlistsError extends Error {
  constructor(
    public readonly status: number,
    message = "Unable to load shortlists. Please try again.",
  ) {
    super(message);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function request(path: string, method = "GET", body?: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    signal,
    ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    let message = "We couldn't update your shortlists. Please try again.";

    if (response.status === 401) message = "Your session has expired. Please sign in again.";

    if (response.status === 404) message = "A shortlist is no longer available. Refresh your shortlists and try again.";

    if (response.status === 409) {
      const error: unknown = await response.json();
      message =
        record(error) && typeof error.error === "string" && error.error.includes("name")
          ? "You already have a shortlist with that name. Choose another name."
          : "Your shortlists changed. Please try again.";
    }
    throw new ShortlistsError(response.status, message);
  }
  return response.json();
}

function parseDestinationSummary(value: unknown, destinationId: string): DestinationSummary {
  if (!record(value) || value.id !== destinationId || typeof value.name !== "string" || typeof value.country !== "string") {
    throw new Error("Invalid destination summary");
  }

  return { id: destinationId, name: value.name, country: value.country };
}

function parseShortlist(value: unknown): Shortlist {
  if (!record(value) || typeof value.id !== "string" || typeof value.shortlistName !== "string" || !Array.isArray(value.shortlistItems)) {
    throw new Error("Invalid shortlist response");
  }

  const destinationSummaries: DestinationSummary[] = [];
  const destinationIds = value.shortlistItems.map((item: unknown) => {
    if (!record(item) || typeof item.destinationId !== "string") throw new Error("Invalid shortlist destination");

    if ("destination" in item) {
      destinationSummaries.push(parseDestinationSummary(item.destination, item.destinationId));
    }

    return item.destinationId;
  });

  return {
    id: value.id,
    name: value.shortlistName,
    destinationIds,
    ...(destinationSummaries.length > 0 ? { destinationSummaries } : {}),
  };
}

export async function getShortlists(signal?: AbortSignal): Promise<Shortlist[]> {
  const body = await request("/api/shortlists", "GET", undefined, signal);
  if (!record(body) || !Array.isArray(body.userShortlists)) throw new Error("Invalid shortlists response");
  return body.userShortlists.map(parseShortlist);
}

export async function createShortlist(name: string): Promise<Shortlist> {
  const body = await request("/api/shortlists", "POST", { name });

  if (!record(body) || !record(body.shortlist)) throw new Error("Invalid created shortlist response");

  return parseShortlist({ ...body.shortlist, shortlistItems: [] });
}

export async function renameShortlist(shortlistId: string, name: string): Promise<void> {
  await request("/api/shortlists", "PATCH", { shortlistId, name });
}

export async function removeShortlist(shortlistId: string): Promise<void> {
  await request("/api/shortlists", "DELETE", { shortlistId });
}

export async function changeMemberships(change: MembershipChange): Promise<MembershipResult> {
  const body = await request("/api/shortlists/memberships", "PATCH", change);
  if (
    !record(body) ||
    body.destinationId !== change.destinationId ||
    !Array.isArray(body.shortlistIds) ||
    !body.shortlistIds.every((id: unknown) => typeof id === "string")
  ) {
    throw new Error("Invalid membership response");
  }
  const destinationId = "canonicalDestinationId" in body ? body.canonicalDestinationId : change.destinationId;

  if (typeof destinationId !== "string" || destinationId.trim().length === 0) {
    throw new Error("Invalid membership destination");
  }

  const destination = "destination" in body ? parseDestinationSummary(body.destination, destinationId) : undefined;

  const createdShortlist =
    "createdShortlist" in body
      ? parseShortlist(
          record(body.createdShortlist)
            ? { ...body.createdShortlist, shortlistItems: [{ destinationId, ...(destination ? { destination } : {}) }] }
            : null,
        )
      : undefined;
  return {
    destinationId,
    shortlistIds: body.shortlistIds,
    ...(destination ? { destination } : {}),
    ...(createdShortlist ? { createdShortlist } : {}),
  };
}
