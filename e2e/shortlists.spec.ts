import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";

const destinationId = "lisbon-portugal";
// Destination journeys wait for the document, then assert UI readiness without waiting for the hero image.
test("first save requires confirmation; Escape, close and Cancel write nothing", async ({ page }) => {
  const state = await mockShortlists(page, []);
  await page.goto(`/destinations/${destinationId}`, { waitUntil: "domcontentloaded" });
  const save = page.getByRole("button", { name: "Save destination", exact: true });
  await save.click();
  await page.getByLabel("Shortlist name").fill("Portugal");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(save).toBeFocused();
  expect(state.writes).toBe(0);
  await save.click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  expect(state.writes).toBe(0);
  await save.click();
  await page.getByLabel("Shortlist name").fill("Portugal");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toBe(0);
  await save.click();
  await page.getByLabel("Shortlist name").fill("Portugal");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved");
  await expect(page.getByRole("link", { name: "Portugal", exact: true })).toBeVisible();
  await expect(page.getByText("1 destination", { exact: true })).toBeVisible();
});
test("multiple memberships, failed retry, last removal, and reusable empty lists", async ({ page }) => {
  const state = await mockShortlists(page, [
    { id: "a", name: "Summer", destinationIds: [destinationId] },
    { id: "b", name: "Winter", destinationIds: [] },
  ]);
  await page.goto(`/destinations/${destinationId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Summer/ })).toBeChecked();
  await page.getByRole("checkbox", { name: /Winter/ }).check();
  state.failNext = true;
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("couldn't update");
  await expect(page.getByRole("checkbox", { name: /Winter/ })).toBeChecked();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/saved/a");
  await page.getByRole("button", { name: "Remove Lisbon from this shortlist" }).click();
  await expect(page.getByText("This shortlist is ready for your ideas")).toBeVisible();
  await page.goto(`/destinations/${destinationId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("checkbox", { name: /Winter/ }).uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeVisible();
  await page.goto("/saved");
  await expect(page.getByRole("article")).toHaveCount(2);
  await expect(page.getByText("0 destinations", { exact: true })).toHaveCount(2);
});
test("overview creation, rename validation, and deletion preserve other memberships", async ({ page }) => {
  await mockShortlists(page, [
    { id: "a", name: "Summer", destinationIds: [destinationId] },
    { id: "b", name: "Winter", destinationIds: [destinationId] },
  ]);
  await page.goto("/saved");
  await page.getByRole("button", { name: "Create shortlist" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Shortlist name").fill("Ideas");
  await dialog.getByRole("button", { name: "Create shortlist" }).click();
  await expect(page.getByRole("link", { name: "Ideas", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Summer", exact: true }).click();
  await page.getByRole("button", { name: "Rename shortlist" }).click();
  await dialog.getByLabel("Shortlist name").fill("  ");
  await dialog.getByRole("button", { name: "Save name" }).click();
  await expect(dialog.getByRole("alert")).toContainText("between 1 and 80");
  await dialog.getByLabel("Shortlist name").fill("winter");
  await dialog.getByRole("button", { name: "Save name" }).click();
  await expect(dialog.getByRole("alert")).toContainText("already have");
  await dialog.getByLabel("Shortlist name").fill("Portugal");
  await dialog.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByRole("heading", { name: "Portugal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete shortlist" }).click();
  await expect(dialog).toContainText("0 destinations are saved only here");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Portugal", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Delete shortlist" }).click();
  await dialog.getByRole("button", { name: "Delete shortlist" }).click();
  await expect(page.getByRole("heading", { name: "Shortlist not found" })).toBeVisible();
  await page.goto("/saved/b");
  await expect(page.getByRole("heading", { name: "Lisbon", exact: true })).toBeVisible();
});
test("stale picker refresh retains surviving choices and can create a list with other changes", async ({ page }) => {
  const state = await mockShortlists(page, [
    { id: "a", name: "Summer", destinationIds: [destinationId] },
    { id: "b", name: "Winter", destinationIds: [] },
  ]);
  await page.goto(`/destinations/${destinationId}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Saved", exact: true }).click();
  await page.getByRole("checkbox", { name: /Summer/ }).uncheck();
  await page.getByRole("checkbox", { name: /Winter/ }).check();
  await page.getByRole("checkbox", { name: "Create a new shortlist" }).check();
  await page.getByLabel("Shortlist name").fill("Portugal");
  state.lists = state.lists.filter((list) => list.id !== "a");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("no longer available");
  await page.getByRole("button", { name: "Refresh shortlists" }).click();
  await expect(page.getByRole("checkbox", { name: /Summer/ })).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: /Winter/ })).toBeChecked();
  await expect(page.getByLabel("Shortlist name")).toHaveValue("Portugal");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.lists.filter((list) => list.destinationIds.includes(destinationId))).toHaveLength(2);
});
test("guest continuation opens the picker without saving and cancellation keeps it unsaved", async ({ page }) => {
  const state = await mockShortlists(page, []);
  state.signedIn = false;
  await page.goto(`/destinations/${destinationId}?month=June`, { waitUntil: "domcontentloaded" });
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
  expect(state.writes).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(state.writes).toBe(0);
});
test("mobile shortlist browsing and picker fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page, [
    { id: "a", name: "A".repeat(80), destinationIds: [destinationId] },
    { id: "b", name: "Weekend ideas", destinationIds: [] },
  ]);
  await page.goto("/saved");
  await expect(page.getByRole("article")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/shortlists-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "A".repeat(80), exact: true }).click();
  await page.getByRole("button", { name: "Edit shortlists" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.getByRole("dialog").evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
  await page.screenshot({ path: "test-results/shortlist-picker-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("shortlist picker remains usable while the destination image is loading", async ({ page }) => {
  await mockShortlists(page, []);
  let imageRequested = false;
  let releaseImage = () => {};
  const imagePending = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route("**/_next/image**", async (route) => {
    imageRequested = true;
    await imagePending;
    await route.abort();
  });
  try {
    await page.goto(`/destinations/${destinationId}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Save destination", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect.poll(() => imageRequested).toBe(true);
    expect(await page.evaluate(() => document.readyState)).not.toBe("complete");
  } finally {
    releaseImage();
  }
});
