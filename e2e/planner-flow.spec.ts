import { expect, test, type Page } from "@playwright/test";

async function completeTripDetails(page: Page) {
  await page.getByLabel("Where are you travelling from?").fill("London");
  await page.getByLabel("When do you want to travel?").selectOption("June");
  await page.getByLabel("Duration").fill("5");
  await page.getByLabel("Budget").fill("2200");
  await page.getByLabel("Travellers").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();
}

async function completePlanner(page: Page) {
  await completeTripDetails(page);
  await page.getByRole("button", { name: "City break" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Museums" }).click();
  await page.getByRole("button", { name: "Architecture" }).click();
}

test("completes the planner and shows ranked destination matches", async ({ page }) => {
  await page.goto("/planner");
  await completePlanner(page);
  await page.getByRole("button", { name: "See matches" }).click();

  await expect(page).toHaveURL(/\/results\?/);
  await expect(page.getByRole("heading", { level: 1, name: "Places worth considering." })).toBeVisible();
  await expect(page.getByLabel("Your trip details")).toContainText("London");
  await expect(page.getByLabel("Destination matches").getByRole("article")).toHaveCount(5);
  await expect(page.getByText("Best match", { exact: true })).toBeVisible();
  const firstResult = page.getByLabel("Destination matches").getByRole("article").first();
  await expect(firstResult.getByText("Why this match?")).toBeVisible();
  await expect(firstResult.getByText("Travel month")).toBeVisible();
});

test("changing trip type clears activities from the previous choice", async ({ page }) => {
  await page.goto("/planner");
  await completePlanner(page);

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Beach holiday" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("button", { name: "Museums" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Beaches" })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "See matches" })).toBeDisabled();
});

test("edit answers returns to a populated planner", async ({ page }) => {
  await page.goto("/planner");
  await completePlanner(page);
  await page.getByRole("button", { name: "See matches" }).click();
  await page.getByRole("link", { name: "Edit answers" }).click();

  await expect(page).toHaveURL(/\/planner\?/);
  await expect(page.getByLabel("Where are you travelling from?")).toHaveValue("London");
  await expect(page.getByLabel("When do you want to travel?")).toHaveValue("June");
  await expect(page.getByLabel("Duration")).toHaveValue("5");
  await expect(page.getByLabel("Budget")).toHaveValue("2200");
  await expect(page.getByLabel("Travellers")).toHaveValue("2");
});

test("asks guests to sign in before saving and preserves their results URL", async ({ page }) => {
  await page.goto("/planner");
  await completePlanner(page);
  await page.getByRole("button", { name: "See matches" }).click();
  await expect(page).toHaveURL(/\/results\?/);
  const resultsUrl = new URL(page.url());
  const firstResult = page.getByLabel("Destination matches").getByRole("article").first();
  await firstResult.getByRole("button", { name: "Save destination" }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe(resultsUrl.pathname + resultsUrl.search);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("shows the signed-out Saved page without private destinations", async ({ page }) => {
  await page.goto("/saved");
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.getByRole("heading", { name: "Sign in to view your saved destinations" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Explore destinations" })).toHaveAttribute("href", "/planner");
});

test("header sign-in preserves the page and cancellation returns there", async ({ page }) => {
  await page.goto("/planner?month=June#trip");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/planner?month=June#trip");
  await page.getByRole("link", { name: "Back to exploring" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/planner\?month=June#trip$/);
});
