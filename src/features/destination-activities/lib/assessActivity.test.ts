import { assessActivity } from "./assessActivity";

it("supports museum presence with a named example and preserves the bounded search scope", () => {
  const assessment = assessActivity("Museums", {
    destinationId: "wikidata:Q159457",
    category: "entertainment.museum",
    latitude: 37.0333,
    longitude: -7.9167,
    radiusMetres: 4000,
    limit: 20,
    retrievedAt: "2026-11-03T12:00:00Z",
    coverage: "sample",
    places: [
      {
        sourceId: "museum-1",
        name: "Museu Municipal de Faro",
        categories: ["entertainment.museum"],
        latitude: 37.02,
        longitude: -7.93,
        sourceUrl: "https://www.openstreetmap.org/node/1",
        access: "unknown",
      },
    ],
  });

  expect(assessment).toMatchObject({
    activity: "Museums",
    status: "supported",
    reason: "named_places",
    places: [{ name: "Museu Municipal de Faro" }],
  });
  expect(assessment.observation).toMatchObject({ destinationId: "wikidata:Q159457", radiusMetres: 4000, retrievedAt: "2026-11-03T12:00:00Z" });
});

it("does not use remote, restricted or closed venues as destination-wide support or contradiction", () => {
  const assessment = assessActivity("Museums", {
    destinationId: "wikidata:Q159457",
    category: "entertainment.museum",
    latitude: 37.0333,
    longitude: -7.9167,
    radiusMetres: 4000,
    limit: 20,
    retrievedAt: "2026-11-03T12:00:00Z",
    coverage: "sample",
    places: [
      {
        sourceId: "remote",
        name: "Remote museum",
        categories: ["entertainment.museum"],
        latitude: 38.7,
        longitude: -9.1,
        sourceUrl: "https://www.openstreetmap.org/node/2",
        access: "unknown",
      },
    ],
  });
  expect(assessment).toMatchObject({ status: "unknown", reason: "no_places", places: [] });
});

it("shows one example for likely duplicate same-name listings while retaining source observations", () => {
  const places = ["node", "building"].map((sourceId) => ({
    sourceId,
    name: "The same museum",
    categories: ["entertainment.museum"],
    latitude: 37.02,
    longitude: -7.93,
    sourceUrl: "https://www.openstreetmap.org/node/1",
    access: "unknown" as const,
  }));
  const observation = {
    destinationId: "wikidata:Q159457",
    category: "entertainment.museum",
    latitude: 37.0333,
    longitude: -7.9167,
    radiusMetres: 4000,
    limit: 20 as const,
    retrievedAt: "2026-11-03T12:00:00Z",
    coverage: "sample" as const,
    places,
  };
  const assessment = assessActivity("Museums", observation);
  expect(assessment.places).toHaveLength(1);
  expect(assessment.observation?.places).toHaveLength(2);
});

it.each(["Quiet beaches", "Swimming", "Food markets", "Local restaurants", "Hiking", "Historic sites"])(
  "keeps the unsupported claim %s unknown",
  (activity) => {
    expect(
      assessActivity(activity, {
        destinationId: "place",
        category: "beach",
        latitude: 37,
        longitude: -7,
        radiusMetres: 4000,
        limit: 20,
        retrievedAt: "2026-11-03T12:00:00Z",
        coverage: "sample",
        places: [],
      }),
    ).toMatchObject({ status: "unknown", reason: "unsupported_interest", places: [] });
  },
);

it.each(["restricted", "closed"] as const)("does not infer destination-wide contradiction from a %s place", (access) => {
  expect(
    assessActivity("Museums", {
      destinationId: "place",
      category: "entertainment.museum",
      latitude: 37,
      longitude: -7,
      radiusMetres: 4000,
      limit: 20,
      retrievedAt: "2026-11-03T12:00:00Z",
      coverage: "sample",
      places: [
        {
          sourceId: "closed",
          name: "Museum",
          latitude: 37,
          longitude: -7,
          categories: ["entertainment.museum"],
          sourceUrl: "https://www.openstreetmap.org/node/1",
          access,
        },
      ],
    }),
  ).toMatchObject({ status: "unknown", reason: "no_places", places: [] });
});

it("keeps a capped sample unknown even when named examples are available", () => {
  expect(
    assessActivity("Bars", {
      destinationId: "place",
      category: "catering.bar",
      latitude: 37,
      longitude: -7,
      radiusMetres: 4000,
      limit: 20,
      retrievedAt: "2026-11-03T12:00:00Z",
      coverage: "incomplete",
      places: [
        {
          sourceId: "bar",
          name: "A bar",
          latitude: 37,
          longitude: -7,
          categories: ["catering.bar"],
          sourceUrl: "https://www.openstreetmap.org/node/1",
          access: "unknown",
        },
      ],
    }),
  ).toMatchObject({ status: "unknown", reason: "incomplete_evidence", places: [{ name: "A bar" }] });
});
