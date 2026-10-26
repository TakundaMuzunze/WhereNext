import { changeMemberships, createShortlist, getShortlists, removeShortlist, renameShortlist, ShortlistsError } from "./shortlists";
const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});
function respond(body: unknown, status = 200) {
  mockFetch.mockResolvedValue({ ok: status < 400, status, json: async () => body });
}
it("reads the actual server response and preserves empty lists", async () => {
  respond({
    userShortlists: [
      { id: "a", shortlistName: "Summer", shortlistItems: [{ destinationId: "lisbon-portugal" }] },
      { id: "b", shortlistName: "Empty", shortlistItems: [] },
    ],
  });
  await expect(getShortlists()).resolves.toEqual([
    { id: "a", name: "Summer", destinationIds: ["lisbon-portugal"] },
    { id: "b", name: "Empty", destinationIds: [] },
  ]);
});
it.each([null, { shortlists: [] }, { userShortlists: [null] }, { userShortlists: [{ id: "a", shortlistName: "Summer", shortlistItems: [null] }] }])(
  "rejects malformed server data: %j",
  async (body) => {
    respond(body);
    await expect(getShortlists()).rejects.toThrow();
  },
);
it("creates using a name and validates the returned list", async () => {
  respond({ shortlist: { id: "a", shortlistName: "Ideas" } });
  await expect(createShortlist("Ideas")).resolves.toEqual({ id: "a", name: "Ideas", destinationIds: [] });
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ name: "Ideas" });
});
it("sends explicit membership changes in one request", async () => {
  const change = { destinationId: "lisbon-portugal", addTo: ["a"], removeFrom: ["b"], createName: "Ideas" };
  respond({ destinationId: change.destinationId, shortlistIds: ["a", "new"], isSaved: true });
  await expect(changeMemberships(change)).resolves.toEqual({ destinationId: change.destinationId, shortlistIds: ["a", "new"] });
  expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual(change);
});
it.each([401, 404, 500])("preserves status %s for recovery", async (status) => {
  respond({ error: "Failure" }, status);
  await expect(getShortlists()).rejects.toMatchObject({ status });
});
it("explains duplicate names", async () => {
  respond({ error: "A shortlist with that name already exists" }, 409);
  await expect(createShortlist("Ideas")).rejects.toThrow("already have a shortlist");
});
it("renames and deletes using the existing route contract", async () => {
  respond({});
  await renameShortlist("a", "Ideas");
  await removeShortlist("a");
  expect(mockFetch.mock.calls.map(([, options]) => [options.method, JSON.parse(options.body)])).toEqual([
    ["PATCH", { shortlistId: "a", name: "Ideas" }],
    ["DELETE", { shortlistId: "a" }],
  ]);
});
it("rejects a membership response for another destination", async () => {
  respond({ destinationId: "wrong", shortlistIds: [] });
  await expect(changeMemberships({ destinationId: "lisbon-portugal", addTo: [], removeFrom: [] })).rejects.toThrow("Invalid membership");
});
it("uses a recoverable error type", () => {
  expect(new ShortlistsError(404)).toBeInstanceOf(Error);
});

it("uses the canonical destination identity returned for a verified alias", async () => {
  respond({
    destinationId: "wikidata:Q597",
    canonicalDestinationId: "lisbon-portugal",
    shortlistIds: ["new"],
    createdShortlist: { id: "new", shortlistName: "Summer" },
  });
  await expect(changeMemberships({ destinationId: "wikidata:Q597", addTo: [], removeFrom: [], createName: "Summer" })).resolves.toEqual({
    destinationId: "lisbon-portugal",
    shortlistIds: ["new"],
    createdShortlist: { id: "new", name: "Summer", destinationIds: ["lisbon-portugal"] },
  });
});

it.each([null, 42, "", "   "])("rejects an invalid canonical destination identity: %j", async (canonicalDestinationId) => {
  respond({ destinationId: "wikidata:Q597", canonicalDestinationId, shortlistIds: [] });
  await expect(changeMemberships({ destinationId: "wikidata:Q597", addTo: [], removeFrom: [] })).rejects.toThrow("Invalid membership");
});

it("keeps server-validated imported place summaries for saved cards", async () => {
  respond({
    userShortlists: [
      {
        id: "a",
        shortlistName: "Summer",
        shortlistItems: [{ destinationId: "wikidata:Q159457", destination: { id: "wikidata:Q159457", name: "Faro", country: "Portugal" } }],
      },
    ],
  });
  await expect(getShortlists()).resolves.toEqual([
    {
      id: "a",
      name: "Summer",
      destinationIds: ["wikidata:Q159457"],
      destinationSummaries: [{ id: "wikidata:Q159457", name: "Faro", country: "Portugal" }],
    },
  ]);
});

it("rejects a summary attached to a different saved identity", async () => {
  respond({
    userShortlists: [
      {
        id: "a",
        shortlistName: "Summer",
        shortlistItems: [{ destinationId: "wikidata:Q159457", destination: { id: "wikidata:Q597", name: "Lisbon", country: "Portugal" } }],
      },
    ],
  });
  await expect(getShortlists()).rejects.toThrow("Invalid destination summary");
});
