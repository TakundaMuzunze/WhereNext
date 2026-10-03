export type SaveDestinationResult = "saved" | "unauthorised";

export async function saveDestination(destinationId: string): Promise<SaveDestinationResult> {
  const response = await fetch("/api/saved-destinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinationId }),
  });

  if (response.status === 401) return "unauthorised";

  if (!response.ok) {
    throw new Error("Failed to save destination. Please try again.");
  }

  return "saved";
}

export class SavedDestinationsError extends Error {
  constructor(public readonly status: number) {
    super("Unable to load saved destinations.");
  }
}

export async function getSavedDestinations(signal?: AbortSignal): Promise<string[]> {
  const response = await fetch("/api/saved-destinations", { cache: "no-store", signal });

  if (!response.ok) throw new SavedDestinationsError(response.status);

  const body: unknown = await response.json();

  if (!body || typeof body !== "object" || !("savedUserDestinations" in body) || !Array.isArray(body.savedUserDestinations)) {
    throw new Error("Invalid saved destinations response");
  }

  return body.savedUserDestinations.map((item: unknown) => {
    if (!item || typeof item !== "object" || !("destinationId" in item) || typeof item.destinationId !== "string") {
      throw new Error("Invalid saved destination");
    }
    return item.destinationId;
  });
}

export async function removeDestination(destinationId: string): Promise<"removed" | "unauthorised"> {
  const response = await fetch("/api/saved-destinations", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destinationId }),
  });

  if (response.status === 401) return "unauthorised";

  if (!response.ok) throw new Error("Unable to remove destination");

  return "removed";
}
