import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";

test.skip(process.env.IMPORTED_DESTINATION_TESTS !== "disposable", "Run npm run test:shortlists:db -- --browser.");
const request = "kind=discovery&nights=5&adults=2&budget=200000&activity=Beaches";

test("shows the selected month's historical conditions in results and imported details without provider requests", async ({ page }) => {
  await mockShortlists(page);
  let providerRequests = 0;
  page.on("request", (event) => {
    if (/power\.larc\.nasa\.gov|\/activities$|\/api\/discovery/.test(event.url())) providerRequests++;
  });

  await page.goto(`/results?${request}&timing=month&month=2027-07`);
  const faro = page.getByRole("article", { name: "Faro, Portugal" });
  await expect(faro).toContainText("July · 21.0°C mean air");
  await expect(faro).toContainText("Beach climate: matches our climate preferences");
  await faro.getByRole("link", { name: "Explore Faro" }).click();
  const season = page.getByRole("region", { name: "Seasonal guidance", exact: true });
  await expect(season).toContainText("1991–2020");
  await expect(season).toContainText("0.50");
  await expect(season).toContainText("mm/day");
  await expect(season).toContainText("not a forecast for your dates");
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeEnabled();
  expect(providerRequests).toBe(0);
});

test("suggests bounded flexible periods and preserves cross-year monthly context on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  await page.goto(`/destinations/wikidata:Q159457?${request}&timing=flexible`);
  const season = page.getByRole("region", { name: "Seasonal guidance", exact: true });
  await expect(season).toContainText("Climate periods worth considering: July");
  await season.getByText("View monthly climate and preference trade-offs", { exact: true }).click();
  await expect(season.getByRole("heading", { name: "January", exact: true })).toBeVisible();

  await page.goto(`/destinations/wikidata:Q159457?${request}&timing=exact&outbound=2027-12-28&return=2028-01-04`);
  await season.getByText("View monthly climate and preference trade-offs", { exact: true }).click();
  await expect(season.getByRole("heading", { name: "December", exact: true })).toBeVisible();
  await expect(season.getByRole("heading", { name: "January", exact: true })).toBeVisible();
  await expect(season.getByRole("heading", { name: "July", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keeps unpopulated places discoverable with explicit seasonal unknowns", async ({ page }) => {
  await mockShortlists(page);
  await page.goto(`/results?${request}&timing=month&month=2027-07`);
  await page.getByRole("link", { name: /Unverified/ }).click();
  const place = page.getByRole("article", { name: "Alcoutim, Portugal" });
  await expect(place).toContainText("Seasonal guidance: unknown");
  await expect(place.getByRole("link", { name: "Explore Alcoutim" })).toBeVisible();
});

test("separates seasonal conflicts from matches and preserves the requested month through navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page);
  await page.goto(`/results?${request}&timing=month&month=2027-01`);
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("No destinations have a verified seasonal match yet");
  await page.getByRole("link", { name: /Trade-offs/ }).click();
  await expect(page.getByRole("link", { name: /Trade-offs/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("article", { name: "Faro, Portugal" })).toBeVisible();
  await page.getByRole("link", { name: "More destinations" }).click();
  await expect(page).toHaveURL(/seasonal=tradeoffs&page=2/);
  await page.getByRole("link", { name: "Previous destinations" }).click();
  await page.getByRole("link", { name: "Explore Faro", exact: true }).click();
  await expect(page).toHaveURL(/\/destinations\/.*month=2027-01/);
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
