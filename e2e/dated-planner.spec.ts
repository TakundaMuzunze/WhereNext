import { expect, test, type Page } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";

function dates() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 10);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  return { outbound: start.toISOString().slice(0, 10), returning: end.toISOString().slice(0, 10) };
}
async function complete(page: Page) {
  const date = dates();
  await page.getByLabel("Departure airport").selectOption("MAN");
  await page.getByLabel("Outbound date").fill(date.outbound);
  await page.getByLabel("Return date").fill(date.returning);
  await page.getByLabel("Group holiday budget (GBP)").fill("2000.50");
  await page.getByLabel("Daily spending allowance per adult (GBP)").fill("50.25");
  await page.getByLabel("Trip type", { exact: true }).selectOption("city-break");
  await page.getByRole("button", { name: "Museums", exact: true }).click();
  return date;
}

test("dated request survives review, edits, guide navigation and sign-in cancellation", async ({ page }) => {
  await page.goto("/planner");
  await page.getByRole("link", { name: "Plan with exact dates and a UK airport" }).click();
  const date = await complete(page);
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("heading", { name: "Review your dated holiday" })).toBeVisible();
  await expect(page.getByLabel("Your dated trip request")).toContainText("4 nights · 5 spending days");
  await expect(page.getByLabel("Your dated trip request")).toContainText("£2,000.50");
  await page.getByRole("link", { name: "Edit dated request" }).click();
  await expect(page.getByLabel("Outbound date")).toHaveValue(date.outbound);
  await expect(page.getByLabel("Daily spending allowance per adult (GBP)")).toHaveValue("50.25");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Adults", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page).toHaveURL(/\/results\?/);
  const review = new URL(page.url());
  await page.getByLabel("Destination guides").getByRole("link").first().click();
  await expect(page.getByLabel("Your dated trip request")).toContainText("£753.75");
  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toContain("adultCount=3");
  await page.getByRole("link", { name: "Back to exploring" }).filter({ visible: true }).click();
  await page.getByRole("link", { name: "Back to your trip request" }).first().click();
  await expect(page).toHaveURL(review.toString());
  await page.reload();
  await expect(page.getByLabel("Your dated trip request")).toContainText("Museums");
});

test("validates inputs and resets incompatible activities", async ({ page }) => {
  await page.goto("/planner?kind=dated");
  await complete(page);
  await page.getByLabel("Adults", { exact: true }).fill("2.5");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please check your request" })).toBeVisible();
  await expect(page).toHaveURL(/\/planner/);
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await page.getByLabel("Trip type", { exact: true }).selectOption("adventure");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please check your request" })).toContainText("Choose at least one activity");
});

test("rejects malformed marked URLs without legacy fallback", async ({ page }) => {
  await page.goto("/results?kind=dated&kind=dated&month=June");
  await expect(page.getByRole("heading", { name: "Invalid dated request" })).toBeVisible();
});

test("dated planner and review fit a mobile screen", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/planner?kind=dated");
  await complete(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("heading", { name: "Review your dated holiday" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("dated sign-in continuation restores context and opens the picker without saving", async ({ page }) => {
  const state = await mockShortlists(page, []);
  state.signedIn = false;
  await page.goto("/planner?kind=dated");
  await complete(page);
  await page.getByRole("button", { name: "Review trip request" }).click();
  await page.getByLabel("Destination guides").getByRole("link").first().click();
  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  const intent = await page.evaluate(
    () => JSON.parse(sessionStorage.getItem("where-next:pending-save") ?? "null") as { id: string; returnTo: string },
  );
  state.signedIn = true;
  const callback = new URL(intent.returnTo, page.url());
  callback.searchParams.set("resumeSave", intent.id);
  await page.goto(callback.toString(), { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Your dated trip request")).toContainText("£2,000.50");
  expect(state.writes).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("link", { name: "Edit dated request" }).click();
  await expect(page.getByLabel("Trip type", { exact: true })).toHaveValue("city-break");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveAttribute("aria-pressed", "true");
});
