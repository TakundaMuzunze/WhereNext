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

  it("provides complete editorial guidance for every destination", () => {
    destinations.forEach(({ guide }) => {
      expect(guide.bestFor).toHaveLength(3);
      expect(guide.watchOutFor).toHaveLength(2);
      expect(guide.itineraryIdeas).toHaveLength(3);
      expect(guide.travelTips).toHaveLength(2);

      [...guide.bestFor, ...guide.watchOutFor].forEach((text) => expect(text.trim().length).toBeGreaterThan(10));
      [...guide.itineraryIdeas, ...guide.travelTips].forEach(({ title, description }) => {
        expect(title.trim().length).toBeGreaterThan(2);
        expect(description.trim().length).toBeGreaterThan(20);
      });
    });
  });
});
