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
  await expect(page.getByRole("heading", { level: 1, name: "Three places that fit your trip." })).toBeVisible();
  await expect(page.getByLabel("Your trip details")).toContainText("London");
  await expect(page.getByLabel("Destination matches").getByRole("article")).toHaveCount(5);
  await expect(page.getByText("Best match", { exact: true })).toBeVisible();
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
