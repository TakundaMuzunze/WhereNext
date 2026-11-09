const databaseUrl = new URL(process.env.DATABASE_URL ?? "http://invalid");

if (process.env.CATALOGUE_TEST_DATABASE !== "disposable" || databaseUrl.hostname !== "127.0.0.1" || databaseUrl.pathname !== "/catalogue_test") {
  throw new Error("Catalogue source fixtures require the disposable test database.");
}

// Only the fixed source pacing delay is shortened. Production has no bypass flag.
const originalSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, milliseconds, ...argumentsList) =>
  originalSetTimeout(callback, milliseconds === 30000 ? 0 : milliseconds, ...argumentsList);

let sourcePages = 0;

globalThis.fetch = async (input) => {
  const url = new URL(input);

  if (url.hostname === "query.wikidata.org") {
    sourcePages++;
    if (process.env.CATALOGUE_TEST_SOURCE_FAILURE === "always" || (process.env.CATALOGUE_TEST_SOURCE_FAILURE === "second" && sourcePages === 2)) {
      return new Response(null, { status: 503 });
    }

    const query = url.searchParams.get("query");
    const cursor = /FILTER\(STR\(\?place\) > "http:\/\/www.wikidata.org\/entity\/(Q\d+)"\)/.exec(query)?.[1] ?? "";
    const limit = Number(/LIMIT (\d+)/.exec(query)?.[1]);
    const countryIds = ["Q45", "Q29", "Q142", "Q38", "Q41", "Q233"];
    const countryIndex = countryIds.findIndex((id) => query.includes(`wd:${id}.`));
    if (countryIndex < 0) throw new Error("Unexpected fixture country.");
    const firstId = (countryIndex + 1) * 1000;
    const records = countryIndex === 0 ? 51 : 1;
    const rows = Array.from({ length: records }, (_, index) => ({
      place: { value: `http://www.wikidata.org/entity/Q${firstId + index}` },
      article: { value: `https://en.wikivoyage.org/wiki/Fixture_${firstId + index}` },
    }))
      .filter((row) => row.place.value.split("/").at(-1) > cursor)
      .slice(0, limit);
    return Response.json({ results: { bindings: rows } });
  }

  if (url.hostname === "en.wikivoyage.org") {
    const pages = Object.fromEntries(
      url.searchParams
        .get("titles")
        .split("|")
        .map((title) => {
          const pageId = Number(title.split(" ").at(-1));
          return [
            pageId,
            {
              pageid: pageId,
              title,
              pageprops: { wikibase_item: `Q${pageId}` },
              coordinates: [{ lat: 37, lon: -8, globe: "earth", primary: "" }],
              categories: [{ title: "Category:City articles" }, { title: "Category:Usable cities" }],
              revisions: [{ revid: 1234 }],
            },
          ];
        }),
    );
    return Response.json({ query: { pages } });
  }

  throw new Error("Unexpected source request in catalogue fixture.");
};
