import { expect, test } from "@playwright/test";

import { mockShortlists } from "./fixtures/shortlists";

test.beforeEach(async ({ page }) => {
  await mockShortlists(page);
});

test("signing out from personalised details keeps the destination and planner answers", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: /start planning/i })
    .first()
    .click();
  await page.getByLabel("Where are you travelling from?").fill("London");
  await page.getByLabel("When do you want to travel?").selectOption("June");
  await page.getByLabel("Duration").fill("5");
  await page.getByLabel("Budget").fill("2200");
  await page.getByLabel("Travellers").fill("2");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "City break" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Museums" }).click();
  await page.getByRole("button", { name: "See matches" }).click();
  const first = page.getByLabel("Destination matches").getByRole("article").first();
  const saveButton = first.getByRole("button", { name: /^(Save destination|Saved)$/ });
  await expect(saveButton).toBeEnabled();
  if ((await saveButton.getAttribute("aria-pressed")) === "false") {
    await saveButton.click();
    await page.getByRole("checkbox", { name: /Summer/ }).check();
    await page.getByRole("button", { name: "Save changes" }).click();
  }
  await expect(first.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await first.getByRole("link", { name: "View destination" }).click();
  await expect(page).toHaveURL(/\/destinations\//);
  const detailsUrl = page.url();
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page).toHaveURL(detailsUrl);
  await page.getByRole("checkbox", { name: /Summer/ }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeVisible();
  await expect(page).toHaveURL(detailsUrl);
  await page.getByRole("button", { name: "Open account menu for Traveller" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page).toHaveURL(detailsUrl);
  await expect(page.getByText("Built around your trip answers")).toBeVisible();
});

test("signing out from Saved hides private data and stays on Saved", async ({ page }) => {
  await page.goto("/saved");
  await expect(page.getByRole("article")).toHaveCount(1);
  await page.getByRole("button", { name: "Open account menu for Traveller" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to view your shortlists" })).toBeVisible();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page).toHaveURL(/\/saved$/);
  await page.getByRole("link", { name: "Explore destinations" }).click();
  await expect(page).toHaveURL(/\/planner$/);
});
