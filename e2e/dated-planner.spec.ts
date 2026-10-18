import { expect, test, type Page } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";

function dates() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 10);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 4);
  return { outbound: start.toISOString().slice(0, 10), returning: end.toISOString().slice(0, 10) };
}
async function showStep(page: Page, name: "Essentials" | "Budget" | "Your style") {
  await page
    .getByRole("navigation", { name: "Holiday planning steps" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
}
async function complete(page: Page) {
  const date = dates();
  await page.getByLabel("Departure airport").selectOption("MAN");
  await showStep(page, "Essentials");
  await page.getByLabel("Outbound date").fill(date.outbound);
  await showStep(page, "Essentials");
  await page.getByLabel("Return date").fill(date.returning);
  await showStep(page, "Budget");
  await page.getByLabel("Group holiday budget (GBP)").fill("2000.50");
  await showStep(page, "Budget");
  await page.getByLabel("Daily spending allowance per adult (GBP)").fill("50.25");
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "City break", exact: true }).click();
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Museums", exact: true }).click();
  return date;
}

test("dated request survives review, edits, guide navigation and sign-in cancellation", async ({ page }) => {
  await page.goto("/planner");
  await page.getByRole("link", { name: "Plan with exact dates and a UK airport" }).click();
  const date = await complete(page);
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("heading", { name: "4 nights away for two." })).toBeVisible();
  await expect(page.getByLabel("Your dated trip request")).toContainText("4 nights · 5 spending days");
  await expect(page.getByLabel("Your dated trip request")).toContainText("£2,000.50");
  await page.getByRole("link", { name: "Edit dated request" }).click();
  await expect(page.getByLabel("Outbound date")).toHaveValue(date.outbound);
  await expect(page.getByLabel("Daily spending allowance per adult (GBP)")).toHaveValue("50.25");
  await showStep(page, "Your style");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveAttribute("aria-pressed", "true");
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("3");
  await showStep(page, "Your style");
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
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("2.5");
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please check your request" })).toBeVisible();
  await expect(page).toHaveURL(/\/planner/);
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Adventure", exact: true }).click();
  await showStep(page, "Your style");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveCount(0);
  await showStep(page, "Your style");
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
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("heading", { name: "4 nights away for two." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("dated sign-in continuation restores context and opens the picker without saving", async ({ page }) => {
  const state = await mockShortlists(page, []);
  state.signedIn = false;
  await page.goto("/planner?kind=dated");
  await complete(page);
  await showStep(page, "Your style");
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
  await showStep(page, "Your style");
  await expect(page.getByRole("button", { name: "City break", exact: true })).toHaveAttribute("aria-pressed", "true");
  await showStep(page, "Your style");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("unfinished edits survive reload, navigation and sign-in continuation", async ({ page }) => {
  const state = await mockShortlists(page, []);
  state.signedIn = false;
  await page.goto("/planner?kind=dated");
  const date = await complete(page);
  await showStep(page, "Essentials");
  await page.getByLabel("Return date").fill("");
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("2.5");
  await showStep(page, "Budget");
  await page.getByLabel("Group holiday budget (GBP)").fill("");
  await expect(page).toHaveURL(/draft=1/);
  await page.reload();
  await expect(page.getByLabel("Outbound date")).toHaveValue(date.outbound);
  await expect(page.getByLabel("Return date")).toHaveValue("");
  await expect(page.getByLabel("Adults", { exact: true })).toHaveValue("2.5");
  await showStep(page, "Your style");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveAttribute("aria-pressed", "true");

  const draftUrl = page.url();
  await page.getByRole("link", { name: "Use the month-based planner" }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await page.goBack();
  await expect(page.getByLabel("Adults", { exact: true })).toHaveValue("2.5");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  const returnTo = new URL(page.url()).searchParams.get("returnTo");
  expect(returnTo).toBe(new URL(draftUrl).pathname + new URL(draftUrl).search + new URL(draftUrl).hash);
  await page.getByRole("link", { name: "Back to exploring" }).filter({ visible: true }).click();
  await expect(page.getByLabel("Group holiday budget (GBP)")).toHaveValue("");

  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  state.signedIn = true;
  // Simulate the existing OAuth callback to its captured return URL.
  if (!returnTo) {
    throw new Error("Sign-in must retain the draft return URL.");
  }
  await page.goto(returnTo);
  await expect(page.getByRole("button", { name: /Open account menu/ })).toBeVisible();
  await expect(page.getByLabel("Adults", { exact: true })).toHaveValue("2.5");
  await showStep(page, "Your style");
  await expect(page.getByRole("button", { name: "City break", exact: true })).toHaveAttribute("aria-pressed", "true");
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Please check your request" })).toBeVisible();
  await showStep(page, "Essentials");
  await page.getByLabel("Return date").fill(date.returning);
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await showStep(page, "Budget");
  await page.getByLabel("Group holiday budget (GBP)").fill("2000");
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page).toHaveURL(/\/results\?/);
  expect(new URL(page.url()).searchParams.has("draft")).toBe(false);
});

test("gives field and budget feedback before review and clears corrected errors", async ({ page }) => {
  await page.goto("/planner?kind=dated");
  const date = dates();
  const outbound = page.getByLabel("Outbound date", { exact: true });
  const returning = page.getByLabel("Return date", { exact: true });
  await outbound.fill(date.outbound);
  await returning.fill(date.outbound);
  await expect(returning).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#returnDate-error")).toContainText("between 1 and 28 nights");
  await returning.fill(date.returning);
  await expect(returning).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByText("4 nights · 5 spending days", { exact: true })).toBeVisible();
  await showStep(page, "Budget");
  await page.getByLabel("Group holiday budget (GBP)", { exact: true }).fill("500");
  await showStep(page, "Budget");
  await page.getByLabel("Daily spending allowance per adult (GBP)", { exact: true }).fill("50");
  const budget = page.getByRole("region", { name: "Make room for the good stuff" });
  await expect(budget.getByRole("status")).toContainText("leaves £0");
  await budget.getByRole("link", { name: "Adjust group budget" }).click();
  await showStep(page, "Budget");
  await page.getByLabel("Group holiday budget (GBP)", { exact: true }).fill("600");
  await expect(budget.getByRole("status")).toHaveCount(0);
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("2.5");
  await page.getByLabel("Adults", { exact: true }).press("Tab");
  await expect(page.locator("#adultCount-error")).toContainText("whole number");
  await showStep(page, "Essentials");
  await page.getByLabel("Adults", { exact: true }).fill("2");
  await expect(page.locator("#adultCount-error")).toHaveCount(0);
});

test("mobile summary expands beside review and the brief groups the holiday details", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/planner?kind=dated");
  await complete(page);
  await expect(page.getByRole("heading", { name: "What would make this trip?" })).toBeInViewport();
  const summary = page.locator("details");
  await expect(summary).not.toHaveAttribute("open", "");
  await summary.getByText("Your trip at a glance", { exact: true }).click();
  await expect(summary.getByText("£1,498", { exact: true })).toBeVisible();
  await expect(summary.getByText("£502.50", { exact: true })).toBeVisible();
  await showStep(page, "Your style");
  await page.getByRole("button", { name: "Review trip request" }).click();
  await expect(page.getByRole("heading", { name: "4 nights away for two." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Room for the good stuff" })).toBeVisible();
  await expect(page.getByLabel("Destination guides")).toContainText("not matched holidays");
  await page.getByRole("link", { name: "Edit budget", exact: true }).click();
  await expect(page).toHaveURL(/#budget$/);
  await expect(page.getByLabel("Group holiday budget (GBP)")).toHaveValue("2000.50");
});

test("guided steps validate Continue, preserve answers on Back, and restore the active step", async ({ page }) => {
  await page.goto("/planner?kind=dated");
  await expect(page.getByRole("heading", { name: "Let’s make your next escape happen." })).toBeVisible();
  await expect(page.getByLabel("Group holiday budget (GBP)")).toBeHidden();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#departureAirportCode-error")).toBeVisible();
  await expect(page.getByLabel("Departure airport")).toBeFocused();
  const date = dates();
  await page.getByLabel("Departure airport").selectOption("MAN");
  await page.getByLabel("Outbound date").fill(date.outbound);
  await page.getByLabel("Return date").fill(date.returning);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/#budget$/);
  await expect(page.getByLabel("Outbound date")).toBeHidden();
  await page.getByLabel("Group holiday budget (GBP)").fill("2000.50");
  await page.getByLabel("Daily spending allowance per adult (GBP)").fill("50.25");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL(/#style$/);
  await page.getByRole("button", { name: "City break", exact: true }).click();
  await page.getByRole("button", { name: "Museums", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "City break", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Museums", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Group holiday budget (GBP)")).toHaveValue("2000.50");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Outbound date")).toHaveValue(date.outbound);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Review trip request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "4 nights away for two." })).toBeVisible();
});
