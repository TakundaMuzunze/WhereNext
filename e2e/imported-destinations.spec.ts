import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";

// Server-rendered details read a real catalogue record seeded by the disposable database runner.
test.skip(process.env.IMPORTED_DESTINATION_TESTS !== "disposable", "Run npm run test:shortlists:db -- --browser.");

const destination = { id: "wikidata:Q159457", name: "Faro", country: "Portugal" };
const detailsPath = `/destinations/${destination.id}`;
const plannerQuery = "departure=London&month=June&duration=5&budget=2000&travellers=2&tripType=city-break&activity=Museums";

test("opens imported details, confirms saves, reopens and removes only the selected membership", async ({ page }) => {
  const state = await mockShortlists(
    page,
    [
      { id: "summer", name: "Summer", destinationIds: [] },
      { id: "winter", name: "Winter", destinationIds: [] },
    ],
    [destination],
  );
  const response = await page.goto(`${detailsPath}?${plannerQuery}`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Faro", exact: true })).toBeVisible();
  await expect(page.getByText("Portugal", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Unknown —/)).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Read the Wikivoyage guide" })).toHaveAttribute("href", "https://en.wikivoyage.org/wiki/Faro");
  await expect(page.getByRole("link", { name: "Edit your trip" })).toHaveAttribute("href", `/planner?${plannerQuery}`);
  await expect(page.locator("main img")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("imported-details.png"), fullPage: true });

  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await page.getByRole("checkbox", { name: /Summer/ }).check();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toBe(0);

  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await page.getByRole("checkbox", { name: /Summer/ }).check();
  await page.getByRole("checkbox", { name: /Winter/ }).check();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

  await page.goto("/saved/summer");
  await expect(page.getByRole("heading", { name: "Faro", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View destination" }).click();
  await expect(page).toHaveURL(new RegExp(`/destinations/${destination.id}$`));
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await page.goto("/saved/summer");
  await page.getByRole("button", { name: "Remove Faro from this shortlist" }).click();
  await expect(page.getByRole("heading", { name: "This shortlist is ready for your ideas" })).toBeVisible();
  await page.goto("/saved/winter");
  await expect(page.getByRole("heading", { name: "Faro", exact: true })).toBeVisible();
});

test("guest sign-in resumes the imported picker without writing and cannot replay after cancellation", async ({ page }) => {
  const state = await mockShortlists(page, [{ id: "summer", name: "Summer", destinationIds: [] }], [destination]);
  state.signedIn = false;
  const response = await page.goto(`${detailsPath}?${plannerQuery}`);
  expect(response?.status()).toBe(200);
  await page.getByRole("button", { name: "Save destination", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in\?/);
  const signInUrl = new URL(page.url());
  const journeyId = signInUrl.searchParams.get("saveJourney");
  expect(journeyId).toBeTruthy();
  state.signedIn = true;
  await page.goto(`${signInUrl.searchParams.get("returnTo")}&resumeSave=${journeyId}`);
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(state.writes).toBe(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save destination", exact: true })).toBeVisible();
  expect(state.writes).toBe(0);
});

test("signing out hides imported shortlist data", async ({ page }) => {
  await mockShortlists(page, [{ id: "summer", name: "Summer", destinationIds: [destination.id] }], [destination]);
  await page.goto("/saved/summer");
  await expect(page.getByRole("heading", { name: "Faro", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open account menu for Traveller" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to view your shortlists" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Faro", exact: true })).toHaveCount(0);
});
