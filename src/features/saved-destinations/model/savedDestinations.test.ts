import { saveDestination, unsaveDestination } from "./savedDestinations";

describe("saved destinations", () => {
  it("adds a destination without changing the existing selection", () => {
    const destinationIds = ["lisbon-portugal"];

    expect(saveDestination(destinationIds, "barcelona-spain")).toEqual(["lisbon-portugal", "barcelona-spain"]);
    expect(destinationIds).toEqual(["lisbon-portugal"]);
  });

  it("does not add the same destination twice", () => {
    const destinationIds = ["lisbon-portugal"];

    expect(saveDestination(destinationIds, "lisbon-portugal")).toBe(destinationIds);
  });

  it("removes only the selected destination", () => {
    expect(unsaveDestination(["lisbon-portugal", "barcelona-spain"], "lisbon-portugal")).toEqual(["barcelona-spain"]);
  });
});
