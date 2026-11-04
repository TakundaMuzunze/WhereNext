import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import type { DestinationImage } from "../../src/entities/destination/model/destinationImage";

export const destinationImage: DestinationImage = {
  src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Faro.jpg/1280px-Faro.jpg",
  fileTitle: "File:Faro.jpg",
  sourceUrl: "https://commons.wikimedia.org/wiki/File:Faro.jpg",
  author: "Test photographer",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  attribution: "Test image credit",
  width: 1280,
  height: 960,
};

// Exercise the real photo component while keeping browser tests independent of Wikimedia uptime.
export async function mockWikimediaPhotos(page: Page) {
  const imageBytes = readFileSync("public/images/destination/lisbon.jpg");

  await page.route("**/_next/image?**", async (route) => {
    const imageUrl = new URL(route.request().url()).searchParams.get("url") ?? "";

    if (imageUrl.startsWith("https://upload.wikimedia.org/") || imageUrl.startsWith("https://thumb.wikimedia.org/")) {
      return route.fulfill({ contentType: "image/jpeg", body: imageBytes });
    }

    return route.fallback();
  });
}
