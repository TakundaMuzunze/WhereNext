import { render, screen } from "@testing-library/react";
import { HomeHero } from "./HomeHero";

describe("HomeHero", () => {
  it("presents the primary actions and featured destination", () => {
    render(<HomeHero />);

    expect(screen.getByRole("heading", { level: 1, name: "Where should you go next?" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start planning/i })).toHaveAttribute("href", "/planner");
    expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "#how-it-works");
    expect(screen.getByRole("img", { name: /Split coastline and Lisbon rooftops/i })).toHaveAttribute(
      "src",
      expect.stringContaining("destination-card-stack.png"),
    );
  });
});
