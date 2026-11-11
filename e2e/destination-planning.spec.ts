import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";
import { discoveryInterests } from "../src/features/destination-planning/model/discoveryRequest";

test.skip(process.env.IMPORTED_DESTINATION_TESTS !== "disposable", "Run npm run test:shortlists:db -- --browser.");

async function enterDiscovery(page: import("@playwright/test").Page, airport?: string) {
  await page.goto("/planner");
  await page.getByRole("checkbox", { name: "Museums", exact: true }).check();
  await page.getByText("Beaches & water", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Swimming", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Approximate nights").fill("5");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  if (airport) await page.getByLabel("Departure airport").selectOption(airport);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Group budget (GBP)").fill("2000.50");
}

test("discovers without dates or fares and preserves context through details, editing and guest saving", async ({ page }) => {
  const shortlists = await mockShortlists(page);
  shortlists.signedIn = false;
  let providerCalls = 0;
  page.on("request", (request) => {
    if (/\/api\/(discovery|flights)|\/activities$/.test(request.url())) providerCalls++;
  });
  await enterDiscovery(page, "MAN");
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Places to explore" })).toBeVisible();
  await expect(page.getByText("Trip costs not checked", { exact: true }).first()).toBeVisible();
  const card = page.getByRole("article", { name: "Faro, Portugal" });
  await expect(card.getByText("Museums: evidence pending", { exact: true })).toBeVisible();
  await expect(page.getByText(/Not assessed yet: Swimming/)).toBeVisible();
  await expect(page.getByText(/% match/)).toHaveCount(0);
  await card.getByRole("link", { name: "Explore Faro" }).click();
  await expect(page.getByRole("heading", { name: "Faro", level: 1, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  const returnTo = new URL(page.url()).searchParams.get("returnTo");
  expect(returnTo).toContain("kind=discovery");
  expect(returnTo).toContain("activity=Swimming");
  expect(returnTo).toContain("departureAirportCode=MAN");
  await page.goto(returnTo!);
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await page.getByRole("button", { name: /03 · Your budget/ }).click();
  await expect(page.getByLabel("Group budget (GBP)")).toHaveValue("2000.50");
  await page.getByRole("button", { name: /01 · Your kind of trip/ }).click();
  await expect(page.getByRole("button", { name: "Remove Swimming", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove Swimming", exact: true }).click();
  await page.getByRole("button", { name: /03 · Your budget/ }).click();
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/results" && url.searchParams.getAll("activity").join(",") === "Museums");
  expect(providerCalls).toBe(0);
});

test("retains a preferred month and keeps the mobile summary compact", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  await enterDiscovery(page);
  await page.getByRole("button", { name: /02 · When & who/ }).click();
  await page.getByLabel("Timing", { exact: true }).selectOption("month");
  await page.getByLabel("Preferred month").fill("2027-06");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  const summary = page.getByRole("region", { name: "Your trip request" });
  await expect(summary.getByText("June 2027")).toBeVisible();
  const bounds = await summary.boundingBox();
  expect(bounds!.height).toBeLessThan(250);
  await expect(summary.getByText("Museums, Swimming")).toBeHidden();
  await summary.getByText("View request details", { exact: true }).click();
  await expect(summary.getByText("Museums, Swimming")).toBeVisible();
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await page.getByRole("button", { name: /02 · When & who/ }).click();
  await expect(page.getByLabel("Preferred month")).toHaveValue("2027-06");
  await page.screenshot({ path: test.info().outputPath("destination-planner-mobile.png"), fullPage: true });
});

test("derives exact duration and preserves dates through results and imported details", async ({ page }) => {
  await mockShortlists(page);
  await enterDiscovery(page);
  await page.getByRole("button", { name: /02 · When & who/ }).click();
  await page.getByLabel("Timing", { exact: true }).selectOption("exact");
  await page.getByLabel("Departure date").fill("2027-03-27");
  await page.getByLabel("Return date").fill("2027-03-30");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your trip request" })).toContainText("3 nights");
  await page.getByRole("link", { name: "Explore Faro" }).click();
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await page.getByRole("button", { name: /02 · When & who/ }).click();
  await expect(page.getByLabel("Departure date")).toHaveValue("2027-03-27");
  await expect(page.getByLabel("Return date")).toHaveValue("2027-03-30");
});

test("compares stored evidence without fares, paginates after ranking and preserves verified guide context", async ({ page }) => {
  await mockShortlists(page);
  await enterDiscovery(page);
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  const firstResult = page.getByRole("article").first();
  await expect(firstResult).toHaveAccessibleName("Alcoutim, Portugal");
  await expect(firstResult.getByText("Museums: evidence found nearby", { exact: true })).toBeVisible();
  await expect(firstResult.getByRole("link", { name: "Test museum listing" })).toHaveCount(0);
  await expect(page.getByText(/Not assessed yet: Swimming/)).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(12);
  const cards = page.getByRole("article");
  for (const [width, columns] of [
    [1280, 3],
    [820, 2],
    [390, 1],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    const first = await cards.nth(0).boundingBox();
    const lastInRow = await cards.nth(columns - 1).boundingBox();
    const nextRow = await cards.nth(columns).boundingBox();
    expect(Math.abs(first!.y - lastInRow!.y)).toBeLessThan(2);
    expect(nextRow!.y).toBeGreaterThan(first!.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: test.info().outputPath("discovery-results-three-columns.png"), fullPage: true });
  await page.getByRole("link", { name: "More destinations" }).click();
  await expect(page.getByRole("navigation", { name: "Result pages" })).toContainText("Page 2 of 2");
  await page.getByRole("link", { name: "Previous destinations" }).click();
  await page.getByRole("link", { name: "Explore Lisbon" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lisbon");
  await expect(page.getByRole("region", { name: "Evidence gaps" })).toContainText("Budget fit: unknown");
  await expect(page.getByText("Ideal duration", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Best months", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove Swimming", exact: true })).toBeVisible();
});

test("groups interests, keeps multiple groups open and removes selections without exceeding ten", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  await page.goto("/planner");
  const interests = page.getByRole("group", { name: "What would you like to do?" });
  const culture = interests.locator("details").filter({ hasText: "Culture & history" });
  const beaches = interests.locator("details").filter({ hasText: "Beaches & water" });

  await expect(culture).toHaveAttribute("open", "");
  await expect(beaches).not.toHaveAttribute("open", "");
  await beaches.getByText("Beaches & water", { exact: true }).click();
  await expect(culture).toHaveAttribute("open", "");
  await expect(beaches).toHaveAttribute("open", "");

  for (const interest of [
    "Museums",
    "Architecture",
    "Historic sites",
    "Walking tours",
    "Old towns",
    "Local culture",
    "Shopping",
    "Beaches",
    "Boat trips",
    "Swimming",
  ]) {
    await interests.getByRole("checkbox", { name: interest, exact: true }).check();
  }

  await expect(interests.getByRole("status")).toHaveText("10 of 10 selected");
  await expect(culture.locator("summary")).toContainText("7 selected");
  await expect(beaches.locator("summary")).toContainText("3 selected");
  await expect(interests.getByRole("checkbox", { name: "Island hopping", exact: true })).toBeDisabled();
  await culture.getByText("Culture & history", { exact: true }).click();
  await interests.getByRole("button", { name: "Remove Museums", exact: true }).click();
  await expect(interests.getByRole("status")).toHaveText("9 of 10 selected");
  await expect(interests.getByRole("checkbox", { name: "Island hopping", exact: true })).toBeEnabled();
  await expect(culture).not.toHaveAttribute("open", "");
  await culture.getByText("Culture & history", { exact: true }).click();
  await expect(interests.getByRole("checkbox", { name: "Museums", exact: true })).not.toBeChecked();

  const renderedInterests = await interests
    .getByRole("checkbox", { includeHidden: true })
    .evaluateAll((checkboxes) => checkboxes.map((checkbox) => checkbox.closest("label")?.textContent?.trim()));
  expect(renderedInterests.sort()).toEqual([...discoveryInterests].sort());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await interests.scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath("grouped-interests-mobile.png"), fullPage: true });
});

test("keeps airport and exact dates on the chosen destination through reload and editing without live travel checks", async ({ page }) => {
  await mockShortlists(page);
  let providerCalls = 0;
  page.on("request", (request) => {
    if (/\/api\/(discovery|flights)/.test(request.url())) providerCalls++;
  });
  await enterDiscovery(page, "MAN");
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your trip request" })).toContainText("Manchester (MAN)");
  await page.getByRole("link", { name: "Explore Faro", exact: true }).click();
  const travel = page.getByRole("region", { name: "Let’s look at getting there." });
  await expect(travel.getByLabel("Departure airport")).toHaveValue("MAN");
  await expect(travel.getByRole("button", { name: "Check travel options" })).toBeDisabled();
  await travel.getByLabel("Departure airport").selectOption("LHR");
  const outbound = new Date();
  outbound.setUTCDate(outbound.getUTCDate() + 10);
  const returning = new Date(outbound);
  returning.setUTCDate(returning.getUTCDate() + 4);
  await travel.getByLabel("Outbound date").fill(outbound.toISOString().slice(0, 10));
  await travel.getByLabel("Return date").fill(returning.toISOString().slice(0, 10));
  await travel.getByRole("button", { name: "Save travel details" }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname.includes("Q159457") &&
      url.searchParams.get("departureAirportCode") === "LHR" &&
      url.searchParams.get("timing") === "exact" &&
      url.searchParams.get("nights") === "4",
  );
  await page.reload();
  await expect(travel.getByLabel("Departure airport")).toHaveValue("LHR");
  await expect(travel.getByLabel("Outbound date")).toHaveValue(outbound.toISOString().slice(0, 10));
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Departure airport")).toHaveValue("LHR");
  await expect(page.getByLabel("Departure date")).toHaveValue(outbound.toISOString().slice(0, 10));
  expect(providerCalls).toBe(0);
});
