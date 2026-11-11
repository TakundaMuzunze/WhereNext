import { expect, test } from "@playwright/test";

const request = "kind=discovery&timing=month&nights=7&adults=2&budget=200050&month=2027-07&activity=Beaches&activity=Rooftop+drinks";

test("guides a new discovery through assessable interests and timing with keyboard focus", async ({ page }) => {
  await page.goto("/planner");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("form", { name: "Plan your discovery" }).getByRole("alert")).toBeFocused();
  await expect(page.getByRole("form", { name: "Plan your discovery" }).getByRole("alert")).toContainText("Choose 1–10 interests");
  await page.getByRole("checkbox", { name: "Museums", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A little shape to your escape." })).toBeFocused();
  await page.getByLabel("Timing", { exact: true }).selectOption("month");
  await page.getByLabel("Preferred month").fill("2027-07");
  await page.getByLabel("Approximate nights").fill("7");
  await expect(page.getByLabel("Departure airport")).toHaveCount(0);
  await expect(page.getByLabel("Group budget (GBP)")).toHaveCount(0);
  // Isolate navigation from catalogue/DB availability.
  await page.route("**/results?**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Discovery results</h1>" }));
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname === "/results" &&
      !url.searchParams.has("budget") &&
      url.searchParams.get("activity") === "Museums" &&
      !url.searchParams.has("departureAirportCode"),
  );
});

test("preserves an edited trip and derives cross-year nights on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/planner?" + request);
  await expect(page.getByRole("button", { name: "Remove Rooftop drinks" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Preferred month")).toHaveValue("2027-07");
  await page.getByLabel("Timing", { exact: true }).selectOption("exact");
  await page.getByLabel("Departure date").fill("2027-12-28");
  await page.getByLabel("Return date").fill("2028-01-04");
  await expect(page.getByLabel("Group budget (GBP)")).toHaveCount(0);
  await page.getByText("Your trip taking shape", { exact: false }).click();
  const summary = page.getByRole("complementary", { name: "Your holiday taking shape" });
  await expect(summary).toContainText("7 nights");
  await expect(summary).toContainText("28 Dec 2027");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("guided-discovery-mobile.png"), fullPage: true });
});

test("shows a live desktop brief and keeps invalid dates on their step", async ({ page }) => {
  await page.goto("/planner?" + request);
  const summary = page.getByRole("complementary", { name: "Your holiday taking shape" });
  await expect(summary).toContainText("July 2027");
  await expect(summary).toContainText("£2,000.50");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Adults", { exact: true }).fill("3");
  await expect(summary).toContainText("3 adults");
  await page.getByLabel("Timing", { exact: true }).selectOption("exact");
  await page.getByLabel("Departure date").fill("2027-07-20");
  await page.getByLabel("Return date").fill("2027-07-19");
  await page.getByRole("button", { name: "Discover places", exact: true }).click();
  await expect(page.getByRole("form", { name: "Plan your discovery" }).getByRole("alert")).toContainText("Exact dates must be 1–28 nights apart");
  await expect(page.getByLabel("Departure date")).toBeVisible();
});
