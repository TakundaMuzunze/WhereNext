import { render, screen } from "@testing-library/react";
import { HowItWorks } from "./HowItWorks";

describe("HowItWorks", () => {
  it("explains the recommendation journey and links to the planner", () => {
    render(<HowItWorks />);

    expect(screen.getByRole("heading", { level: 2, name: "Less searching. Better choices." })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
    expect(screen.getByText(/transparent match score/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build my shortlist" })).toHaveAttribute("href", "/planner");
  });
});
