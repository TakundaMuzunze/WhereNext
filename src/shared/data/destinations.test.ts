import { destinations } from "./destinations";

describe("destination data", () => {
  it("provides a unique local image and useful alt text for every destination", () => {
    const imageSources = destinations.map(({ image }) => image.src);

    expect(new Set(imageSources).size).toBe(destinations.length);

    destinations.forEach((destination) => {
      expect(destination.image.src).toMatch(/^\/images\/destination\/[a-z0-9-]+\.jpg$/);
      expect(destination.image.alt.trim().length).toBeGreaterThan(10);
    });
  });
});
