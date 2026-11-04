import { expect, test } from "@playwright/test";
import { mockShortlists } from "./fixtures/shortlists";
import { destinationImage } from "./fixtures/destinationImages";

test.skip(process.env.IMPORTED_DESTINATION_TESTS !== "disposable", "Run npm run test:shortlists:db -- --browser.");

const faro = { id: "wikidata:Q159457", name: "Faro", country: "Portugal", image: destinationImage };
const alcoutim = { id: "wikidata:Q1000041", name: "Alcoutim", country: "Portugal" };
const requestQuery = "kind=discovery&timing=flexible&nights=5&adults=2&budget=200000&activity=Museums";

test("shows card imagery with full credits reserved for destination details", async ({ page }) => {
  await mockShortlists(
    page,
    [{ id: "photos", name: "Places with photos", destinationIds: ["split-croatia", faro.id, alcoutim.id] }],
    [faro, alcoutim],
  );
  await page.goto(`/results?${requestQuery}`);
  const result = page.getByRole("article", { name: "Faro, Portugal" });
  await expect(result.getByRole("img", { name: "View of Faro" })).toBeVisible();
  await expect(result.locator("figcaption")).toHaveCount(0);
  await expect(result.getByRole("link", { name: "CC BY 4.0", exact: true })).toHaveCount(0);
  await result.getByRole("link", { name: "Explore Faro" }).click();
  await expect(page.getByRole("heading", { name: "Faro", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole("img", { name: "View of Faro" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Wikimedia Commons", exact: true })).toHaveAttribute("href", destinationImage.sourceUrl);
  await expect(page.getByText(/Test photographer/)).toBeVisible();
  await expect(page.getByRole("link", { name: "CC BY 4.0", exact: true })).toHaveAttribute("href", destinationImage.licenseUrl);
  await page.goto("/saved/photos");
  const cards = page.getByLabel("Shortlist destinations").getByRole("article");
  await expect(cards).toHaveCount(3);
  await expect(cards.locator("figcaption")).toHaveCount(0);
  const imported = cards.filter({ has: page.getByRole("heading", { name: "Faro", exact: true }) });
  await expect(imported.getByRole("img", { name: "View of Faro" })).toBeVisible();
  const importedPhoto = imported.getByRole("img", { name: "View of Faro" });
  await importedPhoto.scrollIntoViewIfNeeded();
  await expect.poll(() => importedPhoto.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await expect(imported.getByRole("button", { name: "Edit shortlists" })).toBeEnabled();
  await expect(cards.filter({ has: page.getByRole("heading", { name: "Alcoutim", exact: true }) }).getByText("Photo unavailable")).toBeVisible();
  await expect(cards.filter({ has: page.getByRole("heading", { name: "Split", exact: true }) }).getByRole("img")).toBeVisible();
  const splitTitle = await cards
    .filter({ has: page.getByRole("heading", { name: "Split", exact: true }) })
    .getByRole("heading")
    .boundingBox();
  const importedTitle = await imported.getByRole("heading").boundingBox();
  expect(Math.abs(splitTitle!.y - importedTitle!.y)).toBeLessThan(2);
  await page.screenshot({ path: test.info().outputPath("destination-photos-desktop.png"), fullPage: true });
});

test("keeps a deliberate landscape fallback and usable actions when images fail on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockShortlists(page, [{ id: "photos", name: "Photos", destinationIds: [faro.id] }], [faro]);
  await page.route("**/_next/image?**", async (route) => {
    const src = new URL(route.request().url()).searchParams.get("url") ?? "";
    if (src.startsWith("https://upload.wikimedia.org/")) return route.fulfill({ status: 404 });
    return route.fallback();
  });
  await page.goto("/saved/photos");
  await expect(page.getByText("Photo unavailable")).toBeVisible();
  await expect(page.getByRole("link", { name: "View destination" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit shortlists" })).toBeEnabled();
  await page.getByRole("link", { name: "View destination" }).click();
  await expect(page.getByRole("heading", { name: "Faro", exact: true, level: 1 })).toBeVisible();
  await expect(page.getByText("Photo unavailable")).toBeVisible();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("destination-photo-fallback-mobile.png"), fullPage: true });
});

test("shows a loading placeholder until photo bytes arrive without blocking destination actions", async ({ page }) => {
  await mockShortlists(page, [{ id: "photos", name: "Photos", destinationIds: [faro.id] }], [faro]);
  let releaseImage = () => {};
  const imageGate = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  await page.route("**/_next/image?**", async (route) => {
    const src = new URL(route.request().url()).searchParams.get("url") ?? "";
    if (src.startsWith("https://upload.wikimedia.org/")) await imageGate;
    return route.fallback();
  });

  try {
    await page.goto("/saved/photos", { waitUntil: "domcontentloaded" });
    const loading = page.getByRole("status", { name: "Loading photo of Faro" });
    await loading.scrollIntoViewIfNeeded();
    await expect(loading).toBeVisible();
    const photoArea = await loading.boundingBox();
    await expect(page.getByRole("button", { name: "Edit shortlists" })).toBeEnabled();
    await expect(page.getByRole("link", { name: "Wikimedia Commons", exact: true })).toHaveCount(0);
    releaseImage();
    await expect(loading).toHaveCount(0);
    const photo = page.getByRole("img", { name: "View of Faro" });
    await expect(photo).toHaveCSS("opacity", "1");
    const loadedArea = await photo.boundingBox();
    expect(loadedArea!.height).toBeCloseTo(photoArea!.height, 0);
    await expect(page.getByRole("link", { name: "Wikimedia Commons", exact: true })).toHaveCount(0);
  } finally {
    releaseImage();
  }
});
