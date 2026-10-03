import { clearPendingSave, consumePendingSave, googleCallbacks, signInHref } from "./signInJourney";

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/results");
});
function start() {
  const href = signInHref("/results?month=June#destinations", "lisbon-portugal");
  const id = new URL(href, window.location.origin).searchParams.get("saveJourney");
  return googleCallbacks("/results?month=June#destinations", id);
}
it("preserves the page and consumes a matching save once", () => {
  window.history.replaceState({}, "", start().callbackURL);
  expect(consumePendingSave()?.destinationId).toBe("lisbon-portugal");
  expect(window.location.pathname + window.location.search + window.location.hash).toBe("/results?month=June#destinations");
  expect(consumePendingSave()).toBeNull();
});
it("does not resume an unrelated sign-in", () => {
  start();
  const callback = googleCallbacks("/results", null);
  expect(callback.callbackURL).toBe("/results");
  expect(sessionStorage.length).toBe(0);
});
it("rejects expired journeys", () => {
  const callback = start();
  const now = jest.spyOn(Date, "now").mockReturnValue(Date.now() + 16 * 60 * 1000);
  window.history.replaceState({}, "", callback.callbackURL);
  expect(consumePendingSave()).toBeNull();
  now.mockRestore();
});
it("ignores forged callback IDs and cancelled flows", () => {
  const callback = start();
  window.history.replaceState({}, "", "/results?resumeSave=forged");
  expect(consumePendingSave()).toBeNull();
  clearPendingSave();
  window.history.replaceState({}, "", callback.callbackURL);
  expect(consumePendingSave()).toBeNull();
});
it("rejects external redirects", () => {
  expect(googleCallbacks("https://example.com", null).callbackURL).toBe("/");
});

it("restores the exact query encoding after OAuth adds its marker", () => {
  const returnTo = "/results?origin=New%20York&filter=~beach#matches";
  const href = signInHref(returnTo, "lisbon-portugal");
  const id = new URL(href, window.location.origin).searchParams.get("saveJourney");
  window.history.replaceState({}, "", googleCallbacks(returnTo, id).callbackURL);
  expect(consumePendingSave()?.destinationId).toBe("lisbon-portugal");
  expect(window.location.pathname + window.location.search + window.location.hash).toBe(returnTo);
});
