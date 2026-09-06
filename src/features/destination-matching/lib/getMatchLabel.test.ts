import { getMatchLabel } from "./getMatchLabel";

describe("getMatchLabel", () => {
  it.each([
    [100, 1, "Best match"],
    [90, 2, "Excellent alternative"],
    [75, 2, "Strong alternative"],
    [60, 3, "Good alternative"],
    [59, 4, "Possible alternative"],
  ])("labels score %i at rank %i", (score, rank, expected) => {
    expect(getMatchLabel(score, rank)).toBe(expected);
  });
});
