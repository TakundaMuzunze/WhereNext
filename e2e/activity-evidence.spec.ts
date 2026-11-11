import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";
import type { ActivityObservation, ActivityResult } from "../src/features/destination-activities/model/activityEvidence";

test.skip(process.env.IMPORTED_DESTINATION_TESTS !== "disposable", "Run npm run test:shortlists:db -- --browser.");

const museumObservation: ActivityObservation = {
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
      sourceId: "faro-museum",
      name: "Museu Municipal de Faro",
      categories: ["entertainment.museum"],
      latitude: 37.0129511,
      longitude: -7.9338932,
      sourceUrl: "https://www.openstreetmap.org/node/4867247754",
      access: "unknown",
    },
  ],
};
const plannerQuery = "departure=London&month=June&duration=5&budget=2000&travellers=2&tripType=city-break&activity=Museums&activity=Swimming";

test("shows stored evidence on results and details without making an activity request", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  let calls = 0;
  await page.route("**/api/destinations/*/activities", (route) => {
    calls++;
    return route.abort();
  });
  await page.goto("/results?kind=discovery&timing=flexible&nights=5&adults=2&budget=2000&activity=Museums&activity=Swimming");
  const card = page.getByRole("article", { name: "Alcoutim, Portugal" });
  await expect(card.getByText("Museums: evidence found nearby", { exact: true })).toBeVisible();
  await card.screenshot({ path: test.info().outputPath("stored-evidence-card-mobile.png") });
  await card.getByRole("link", { name: "Explore Alcoutim" }).click();
  await expect(page).toHaveURL(/\/destinations\/wikidata%3AQ1000041\?/);
  await expect(page.getByRole("heading", { name: "Museums: evidence found nearby" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Test museum listing", exact: true })).toBeVisible();
  await expect(page.getByText("Not assessed yet: Swimming. These interests remain unknown.", { exact: true })).toBeVisible();
  expect(calls).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page
    .getByRole("region", { name: "Activity fit", exact: true })
    .screenshot({ path: test.info().outputPath("stored-evidence-details-mobile.png") });
});

test("checks requested interests on demand, explains evidence gaps and leaves saving independent", async ({ page }) => {
  const shortlists = await mockShortlists(page);
  let calls = 0;
  await page.route("**/api/destinations/*/activities", async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ activities: ["Museums", "Swimming"] });
    const result: ActivityResult = {
      destinationId: "wikidata:Q159457",
      assessments: [
        { activity: "Museums", status: "supported", reason: "named_places", places: museumObservation.places, observation: museumObservation },
        { activity: "Swimming", status: "unknown", reason: "unsupported_interest", places: [], observation: null },
      ],
    };
    await route.fulfill({ json: result });
  });
  await page.goto(`/destinations/wikidata:Q159457?${plannerQuery}`);
  await expect(page.getByRole("button", { name: "Check nearby activity evidence" })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "Check nearby activity evidence" }).click();
  await expect(page.getByRole("heading", { name: "Museums: evidence found nearby" })).toBeVisible();
  await expect(page.getByText("Not assessed yet: Swimming. These interests remain unknown.", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Museu Municipal de Faro", exact: true })).toHaveAttribute(
    "href",
    museumObservation.places[0].sourceUrl,
  );
  await expect(page.getByText(/Search radius 4 km/)).toBeVisible();
  await expect(page.getByText(/opening are not verified/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Edit your trip" })).toHaveAttribute("href", `/planner?${plannerQuery}`);
  expect(shortlists.writes).toBe(0);
  await page.screenshot({ path: test.info().outputPath("activity-evidence.png"), fullPage: true });
});

test("retries the same interests and labels expired examples as unknown on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  let calls = 0;
  await page.route("**/api/destinations/*/activities", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ activities: ["Museums", "Swimming"] });
    calls++;
    if (calls === 1) return route.fulfill({ status: 503, json: { error: "Unavailable" } });
    const result: ActivityResult = {
      destinationId: "wikidata:Q159457",
      assessments: [
        {
          activity: "Museums",
          status: "unknown",
          reason: "stale_evidence",
          places: museumObservation.places,
          observation: { ...museumObservation, retrievedAt: "2020-01-01T12:00:00Z" },
        },
        { activity: "Swimming", status: "unknown", reason: "unsupported_interest", places: [], observation: null },
      ],
    };
    return route.fulfill({ json: result });
  });
  await page.goto(`/destinations/wikidata:Q159457?${plannerQuery}`);
  await page.getByRole("button", { name: "Check nearby activity evidence" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Activity evidence could not be loaded" })).toHaveText(
    "Activity evidence could not be loaded. Please try again.",
  );
  await page.getByRole("button", { name: "Check nearby activity evidence" }).click();
  await expect(page.getByRole("heading", { name: "Museums: refresh needed" })).toBeVisible();
  await expect(page.getByText(/earlier listings have expired/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Museu Municipal de Faro", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("activity-evidence-mobile.png"), fullPage: true });
});

test("retains previous evidence after a failed retry and replaces it on recovery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);

  const initialResult: ActivityResult = {
    destinationId: "wikidata:Q159457",
    assessments: [
      { activity: "Museums", status: "supported", reason: "named_places", places: museumObservation.places, observation: museumObservation },
      { activity: "Swimming", status: "unknown", reason: "unsupported_interest", places: [], observation: null },
    ],
  };

  await page.route("**/api/destinations/*/activities", (route) => route.fulfill({ json: initialResult }));
  await page.goto(`/destinations/wikidata:Q159457?${plannerQuery}`);
  await page.getByRole("button", { name: "Check nearby activity evidence" }).click();

  const museumLink = page.getByRole("link", { name: "Museu Municipal de Faro", exact: true });
  const retrievalTime = page.getByText(/Retrieved .* UTC · Search radius 4 km/);

  await expect(museumLink).toBeVisible();
  const originalRetrievalTime = await retrievalTime.innerText();

  await page.route("**/api/destinations/*/activities", (route) => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.getByRole("button", { name: "Refresh activity evidence" }).click();

  const activityPanel = page.getByRole("region", { name: "Activity fit", exact: true });

  await expect(activityPanel.getByRole("alert")).toContainText(
    "The latest check failed. Showing previous evidence with its original retrieval times.",
  );
  await expect(museumLink).toBeVisible();
  await expect(retrievalTime).toHaveText(originalRetrievalTime);
  await expect(page.getByText("Not assessed yet: Swimming. These interests remain unknown.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeEnabled();
  await expect(page.getByRole("link", { name: "Edit your trip" })).toHaveAttribute("href", `/planner?${plannerQuery}`);

  await page.route("**/api/destinations/*/activities", (route) =>
    route.fulfill({ status: 429, contentType: "text/plain", body: "Too Many Requests" }),
  );
  await page.getByRole("button", { name: "Refresh activity evidence" }).click();

  await expect(activityPanel.getByRole("alert")).toContainText("Too many activity checks. Please wait a minute before trying again.");
  await expect(museumLink).toBeVisible();
  await expect(retrievalTime).toHaveText(originalRetrievalTime);
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeEnabled();

  const recoveredResult: ActivityResult = {
    ...initialResult,
    assessments: [
      { activity: "Museums", status: "unknown", reason: "no_places", places: [], observation: { ...museumObservation, places: [] } },
      initialResult.assessments[1],
    ],
  };

  await page.route("**/api/destinations/*/activities", (route) => route.fulfill({ json: recoveredResult }));
  await page.getByRole("button", { name: "Refresh activity evidence" }).click();

  await expect(page.getByRole("heading", { name: "Museums: no examples found" })).toBeVisible();
  await expect(museumLink).toHaveCount(0);
  await expect(activityPanel.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps mobile saving independent while activity evidence loads and returns partial coverage", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const shortlists = await mockShortlists(page, []);
  let releaseEvidence = () => {};
  const evidencePending = new Promise<void>((resolve) => {
    releaseEvidence = resolve;
  });

  await page.route("**/api/destinations/*/activities", async (route) => {
    await evidencePending;
    return route.fulfill({
      json: {
        destinationId: "wikidata:Q159457",
        assessments: [
          { activity: "Museums", status: "supported", reason: "named_places", places: museumObservation.places, observation: museumObservation },
          { activity: "Swimming", status: "unknown", reason: "unsupported_interest", places: [], observation: null },
        ],
      },
    });
  });

  try {
    await page.goto(`/destinations/wikidata:Q159457?${plannerQuery}`);
    await page.getByRole("button", { name: "Check nearby activity evidence" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Checking the requested interests" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Checking activity evidence…" })).toBeDisabled();

    await page.getByRole("button", { name: "Save destination", exact: true }).click();
    await page.getByLabel("Shortlist name").fill("Museum ideas");
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
    expect(shortlists.writes).toBeGreaterThan(0);

    releaseEvidence();
    await expect(page.getByRole("heading", { name: "Museums: evidence found nearby" })).toBeVisible();
    await expect(page.getByText("Not assessed yet: Swimming. These interests remain unknown.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: test.info().outputPath("activity-partial-saving-mobile.png"), fullPage: true });
  } finally {
    releaseEvidence();
  }
});

test("preserves a legacy guide when activity geography is unknown", async ({ page }) => {
  await mockShortlists(page);
  await page.route("**/api/destinations/*/activities", (route) =>
    route.fulfill({
      json: {
        destinationId: "lisbon-portugal",
        assessments: ["Museums", "Beaches", "Bars", "Clubs", "Markets"].map((activity) => ({
          activity,
          status: "unknown",
          reason: "location_unknown",
          places: [],
          observation: null,
        })),
      },
    }),
  );
  await page.goto("/destinations/lisbon-portugal");
  await page.getByRole("button", { name: "Check nearby activity evidence" }).click();
  await expect(page.getByRole("heading", { name: "Lisbon Portugal", exact: true })).toBeVisible();
  await expect(page.getByText(/not substituted its airport/)).toHaveCount(5);
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
});

test("the production API decodes imported route IDs and stays offline when live checks are disabled", async ({ request }) => {
  const response = await request.post("/api/destinations/wikidata%3AQ159457/activities", { data: { activities: ["Museums"] } });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ destinationId: "wikidata:Q159457", assessments: [{ status: "unknown", reason: "unavailable" }] });
});
