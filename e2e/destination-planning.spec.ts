import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";

test.skip(process.env.IMPORTED_DESTINATION_TESTS !== "disposable", "Run npm run test:shortlists:db -- --browser.");

async function enterDiscovery(page: import("@playwright/test").Page) {
  await page.goto("/planner");
  await page.getByLabel("Approximate nights").fill("5");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Group budget (GBP)").fill("2000.50");
  await page.getByRole("checkbox", { name: "Museums", exact: true }).check();
  await page.getByRole("checkbox", { name: "Swimming", exact: true }).check();
}

test("discovers without dates or fares and preserves context through details, editing and guest saving", async ({ page }) => {
  const shortlists = await mockShortlists(page);
  shortlists.signedIn = false;
  let providerCalls = 0;
  page.on("request", (request) => {
    if (/\/api\/(discovery|flights)|\/activities$/.test(request.url())) providerCalls++;
  });
  await enterDiscovery(page);
  await page.getByRole("button", { name: "Explore destinations", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Places to explore" })).toBeVisible();
  await expect(page.getByText("Budget fit: unknown", { exact: true }).first()).toBeVisible();
  const card = page.getByRole("article", { name: "Faro, Portugal" });
  await expect(card.getByText("Museums: unknown", { exact: true })).toBeVisible();
  await expect(card.getByText("Swimming: unknown", { exact: true })).toBeVisible();
  await expect(page.getByText(/% match/)).toHaveCount(0);
  await card.getByRole("link", { name: "Explore Faro" }).click();
  await expect(page.getByRole("heading", { name: "Faro", level: 1, exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  const returnTo = new URL(page.url()).searchParams.get("returnTo");
  expect(returnTo).toContain("kind=discovery");
  expect(returnTo).toContain("activity=Swimming");
  await page.goto(returnTo!);
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await expect(page.getByLabel("Group budget (GBP)")).toHaveValue("2000.50");
  await expect(page.getByRole("checkbox", { name: "Swimming", exact: true })).toBeChecked();
  await page.getByRole("checkbox", { name: "Swimming", exact: true }).uncheck();
  await page.getByRole("button", { name: "Explore destinations", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/results" && url.searchParams.getAll("activity").join(",") === "Museums");
  expect(providerCalls).toBe(0);
});

test("retains a preferred month and keeps the mobile summary compact", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  await enterDiscovery(page);
  await page.getByLabel("Timing", { exact: true }).selectOption("month");
  await page.getByLabel("Preferred month").fill("2027-06");
  await page.getByRole("button", { name: "Explore destinations", exact: true }).click();
  const summary = page.getByRole("region", { name: "Your trip request" });
  await expect(summary.getByText("June 2027")).toBeVisible();
  const bounds = await summary.boundingBox();
  expect(bounds!.height).toBeLessThan(250);
  await expect(summary.getByText("Museums, Swimming")).toBeHidden();
  await summary.getByText("View request details", { exact: true }).click();
  await expect(summary.getByText("Museums, Swimming")).toBeVisible();
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await expect(page.getByLabel("Preferred month")).toHaveValue("2027-06");
  await page.screenshot({ path: test.info().outputPath("destination-planner-mobile.png"), fullPage: true });
});

test("derives exact duration and preserves dates through results and imported details", async ({ page }) => {
  await mockShortlists(page);
  await enterDiscovery(page);
  await page.getByLabel("Timing", { exact: true }).selectOption("exact");
  await page.getByLabel("Departure date").fill("2027-03-27");
  await page.getByLabel("Return date").fill("2027-03-30");
  await page.getByRole("button", { name: "Explore destinations", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your trip request" })).toContainText("3 nights");
  await page.getByRole("link", { name: "Explore Faro" }).click();
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await expect(page.getByLabel("Departure date")).toHaveValue("2027-03-27");
  await expect(page.getByLabel("Return date")).toHaveValue("2027-03-30");
});

test("compares stored evidence without fares, paginates after ranking and preserves verified guide context", async ({ page }) => {
  await mockShortlists(page);
  await enterDiscovery(page);
  await page.getByRole("button", { name: "Explore destinations", exact: true }).click();
  const firstResult = page.getByRole("article").first();
  await expect(firstResult).toHaveAccessibleName("Alcoutim, Portugal");
  await expect(firstResult.getByText("Museums: evidence found nearby", { exact: true })).toBeVisible();
  await expect(firstResult.getByRole("link", { name: "Test museum listing" })).toBeVisible();
  await expect(firstResult.getByText("Swimming: unknown", { exact: true })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(12);
  await page.getByRole("link", { name: "More destinations" }).click();
  await expect(page.getByRole("navigation", { name: "Result pages" })).toContainText("Page 2 of 2");
  await page.getByRole("link", { name: "Previous destinations" }).click();
  await page.getByRole("link", { name: "Explore Lisbon" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Lisbon");
  await expect(page.getByRole("region", { name: "Evidence gaps" })).toContainText("Budget fit: unknown");
  await expect(page.getByText("Ideal duration", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Best months", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Edit request", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Swimming", exact: true })).toBeChecked();
});
