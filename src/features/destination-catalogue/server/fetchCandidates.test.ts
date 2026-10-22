/** @jest-environment node */
import { fetchDestinationCandidates } from "./fetchCandidates";

const originalFetch = global.fetch;
const sourceFetch = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
const createWikidataResult = (id: string, title: string) => ({
  place: { value: `http://www.wikidata.org/entity/${id}` },
  article: { value: `https://en.wikivoyage.org/wiki/${title}` },
});
const createWikivoyagePage = (id = "Q159457", name = "Faro") => ({
  pageid: 11446,
  title: name,
  pageprops: { wikibase_item: id },
  coordinates: [{ lat: 37.0333, lon: -7.9167, globe: "earth", primary: "" }],
  categories: [{ title: "Category:City articles" }, { title: "Category:Usable cities" }],
  revisions: [{ revid: 1234 }],
});

beforeEach(() => {
  global.fetch = sourceFetch;
  sourceFetch.mockReset();
});

afterAll(() => {
  global.fetch = originalFetch;
});

function mockSourceResponses(pages: unknown[], rows = [createWikidataResult("Q159457", "Faro")]) {
  sourceFetch.mockResolvedValueOnce(Response.json({ results: { bindings: rows } }));
  const pagesById = Object.fromEntries(pages.map((sourcePage, index) => [String(index), sourcePage]));

  sourceFetch.mockResolvedValueOnce(Response.json({ query: { pages: pagesById } }));
}

it("joins country-scoped Wikidata identities to usable travel destinations without flights", async () => {
  mockSourceResponses([createWikivoyagePage()]);

  const result = await fetchDestinationCandidates("PT", 50, "WhereNextTest/contact");

  expect(result).toMatchObject({
    scanned: 1,
    skipped: 0,
    truncated: false,
    candidates: [
      {
        id: "wikidata:Q159457",
        name: "Faro",
        countryCode: "PT",
        latitude: 37.0333,
        sourceRevisionId: 1234,
        guideStatus: "usable",
      },
    ],
  });
  expect(new URL(String(sourceFetch.mock.calls[0][0])).searchParams.get("query")).toContain("wd:Q45");
  expect(sourceFetch).toHaveBeenCalledTimes(2);
});

it("does not turn countries, incomplete guides or mismatched identities into candidates", async () => {
  mockSourceResponses([{ ...createWikivoyagePage(), categories: [{ title: "Category:Usable countries" }] }, createWikivoyagePage("Q1")]);
  expect(await fetchDestinationCandidates("PT", 50, "test")).toMatchObject({ candidates: [], skipped: 2 });
});

it("rejects missing provenance and invalid coordinates rather than fabricating fields", async () => {
  mockSourceResponses([
    { ...createWikivoyagePage(), revisions: [] },
    { ...createWikivoyagePage(), coordinates: [{ lat: 100, lon: 0, globe: "earth", primary: "" }] },
  ]);
  expect(await fetchDestinationCandidates("PT", 50, "test")).toMatchObject({ candidates: [], skipped: 2 });
});

it("exposes bounded source coverage and does not silently present it as exhaustive", async () => {
  mockSourceResponses([createWikivoyagePage()], [createWikidataResult("Q159457", "Faro"), createWikidataResult("Q597", "Lisbon")]);
  expect(await fetchDestinationCandidates("PT", 1, "test")).toMatchObject({ scanned: 1, truncated: true });
  expect(new URL(String(sourceFetch.mock.calls[1][0])).searchParams.get("titles")).toBe("Faro");
});

it("fails closed on partial category responses and API errors", async () => {
  sourceFetch.mockResolvedValueOnce(Response.json({ results: { bindings: [createWikidataResult("Q159457", "Faro")] } }));
  sourceFetch.mockResolvedValueOnce(Response.json({ query: { pages: {} }, continue: { clcontinue: "more" } }));
  await expect(fetchDestinationCandidates("PT", 50, "test")).rejects.toThrow("Incomplete");
  sourceFetch.mockResolvedValueOnce(Response.json({ error: { code: "maxlag" } }));
  await expect(fetchDestinationCandidates("PT", 50, "test")).rejects.toThrow();
});

it("rejects duplicate destination identities", async () => {
  mockSourceResponses([createWikivoyagePage(), { ...createWikivoyagePage(), pageid: 2 }]);
  await expect(fetchDestinationCandidates("PT", 50, "test")).rejects.toThrow("Ambiguous");
});

it("handles an empty country response without further requests", async () => {
  sourceFetch.mockResolvedValueOnce(Response.json({ results: { bindings: [] } }));
  expect(await fetchDestinationCandidates("MT", 50, "test")).toEqual({ candidates: [], scanned: 0, skipped: 0, truncated: false, nextCursor: null });
  expect(sourceFetch).toHaveBeenCalledTimes(1);
});

it("does not retry source failures or accept an unbounded request", async () => {
  sourceFetch.mockResolvedValueOnce(new Response(null, { status: 429 }));
  await expect(fetchDestinationCandidates("PT", 50, "test")).rejects.toThrow("HTTP 429");
  await expect(fetchDestinationCandidates("PT", 201, "test")).rejects.toThrow("limit");
  expect(sourceFetch).toHaveBeenCalledTimes(1);
});

it("resumes after the last scanned source record, even when that record is not an eligible destination", async () => {
  mockSourceResponses(
    [createWikivoyagePage("Q10", "Faro"), { ...createWikivoyagePage("Q20", "Region"), categories: [] }],
    [createWikidataResult("Q10", "Faro"), createWikidataResult("Q20", "Region"), createWikidataResult("Q30", "Lisbon")],
  );

  const firstPage = await fetchDestinationCandidates("PT", 2, "test");

  expect(firstPage.candidates.map((candidate) => candidate.name)).toEqual(["Faro"]);
  expect(firstPage.nextCursor).toBe("PT:Q20");

  mockSourceResponses([createWikivoyagePage("Q30", "Lisbon")], [createWikidataResult("Q30", "Lisbon")]);

  const secondPage = await fetchDestinationCandidates("PT", 2, "test", firstPage.nextCursor);

  expect(secondPage.candidates.map((candidate) => candidate.name)).toEqual(["Lisbon"]);
  expect(secondPage.nextCursor).toBeNull();

  const resumedRequest = new URL(String(sourceFetch.mock.calls[2][0]));

  expect(resumedRequest.searchParams.get("query")).toContain('FILTER(STR(?place) > "http://www.wikidata.org/entity/Q20")');
});

it("rejects a source page that repeats the cursor instead of advancing", async () => {
  mockSourceResponses([createWikivoyagePage("Q20", "Faro")], [createWikidataResult("Q20", "Faro")]);

  await expect(fetchDestinationCandidates("PT", 2, "test", "PT:Q20")).rejects.toThrow("did not advance");
});

it.each(["ES:Q20", "PT:Q0", "PT:Q20:extra", 'PT:Q20" injected', "", "Q20"])(
  "rejects invalid or wrong-country cursor %s before requesting a source",
  async (cursor) => {
    await expect(fetchDestinationCandidates("PT", 50, "test", cursor)).rejects.toThrow("valid resume cursor");
    expect(sourceFetch).not.toHaveBeenCalled();
  },
);

it("finishes on an exactly full final page without inventing another cursor", async () => {
  mockSourceResponses([createWikivoyagePage("Q30", "Lisbon")], [createWikidataResult("Q30", "Lisbon")]);

  const finalPage = await fetchDestinationCandidates("PT", 1, "test", "PT:Q20");

  expect(finalPage).toMatchObject({ scanned: 1, truncated: false, nextCursor: null });
});
