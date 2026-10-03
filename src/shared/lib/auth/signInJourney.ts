import { getSafeReturnTo } from "./returnTo";

const storageKey = "where-next:pending-save";
const lifetime = 15 * 60 * 1000;
type PendingSave = { id: string; destinationId: string; returnTo: string; expiresAt: number };

export function clearPendingSave() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* Storage can be disabled. */
  }
}

function readPendingSave(): PendingSave | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (
      typeof value === "object" &&
      value !== null &&
      "id" in value &&
      typeof value.id === "string" &&
      "destinationId" in value &&
      typeof value.destinationId === "string" &&
      value.destinationId.length > 0 &&
      "returnTo" in value &&
      typeof value.returnTo === "string" &&
      getSafeReturnTo(value.returnTo) === value.returnTo &&
      "expiresAt" in value &&
      typeof value.expiresAt === "number" &&
      value.expiresAt > Date.now() &&
      value.expiresAt <= Date.now() + lifetime
    ) {
      return { id: value.id, destinationId: value.destinationId, returnTo: value.returnTo, expiresAt: value.expiresAt };
    }
  } catch {
    /* Invalid or unavailable storage cannot authorize a save. */
  }
  clearPendingSave();
  return null;
}

export function signInHref(returnTo: string, destinationId?: string): string {
  clearPendingSave();
  const params = new URLSearchParams({ returnTo: getSafeReturnTo(returnTo) });
  if (destinationId) {
    try {
      const intent: PendingSave = { id: crypto.randomUUID(), destinationId, returnTo: getSafeReturnTo(returnTo), expiresAt: Date.now() + lifetime };
      sessionStorage.setItem(storageKey, JSON.stringify(intent));
      params.set("saveJourney", intent.id);
    } catch {
      /* Sign-in still works; saving will require a second click. */
    }
  }
  return `/sign-in?${params}`;
}

export function googleCallbacks(returnTo: string | null, journeyId: string | null) {
  const intent = readPendingSave();
  const matching = intent && intent.id === journeyId && intent.returnTo === getSafeReturnTo(returnTo);
  const callback = new URL(getSafeReturnTo(returnTo), window.location.origin);
  callback.searchParams.delete("resumeSave");
  if (matching) callback.searchParams.set("resumeSave", intent.id);
  else clearPendingSave();
  const error = new URL("/sign-in", window.location.origin);
  error.searchParams.set("returnTo", getSafeReturnTo(returnTo));
  error.searchParams.set("authError", "1");
  return { callbackURL: callback.pathname + callback.search + callback.hash, errorCallbackURL: error.pathname + error.search };
}

// Consume before making the request: refreshes and repeated effects cannot replay it.
export function consumePendingSave(): PendingSave | null {
  const url = new URL(window.location.href);
  const journeyId = url.searchParams.get("resumeSave");
  if (!journeyId) return null;
  url.searchParams.delete("resumeSave");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  const intent = readPendingSave();
  clearPendingSave();
  if (!intent || intent.id !== journeyId) return null;
  const expected = new URL(intent.returnTo, window.location.origin);
  if (expected.pathname !== url.pathname || expected.searchParams.toString() !== url.searchParams.toString() || expected.hash !== url.hash)
    return null;
  window.history.replaceState(window.history.state, "", intent.returnTo);
  return intent;
}
