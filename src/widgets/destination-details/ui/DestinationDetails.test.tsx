import type { PlannerAnswers } from "@/entities/trip/model/types";
import { getRecommendations } from "@/features/destination-matching";
import { render, screen } from "@testing-library/react";
import { DestinationDetails } from "./DestinationDetails";

const answers: PlannerAnswers = {
  departure: "London",
  travelMonth: "June",
  duration: 5,
  budget: 2200,
  travellers: 2,
  tripType: "city-break",
  activities: ["Architecture", "Food markets", "Cocktail bars"],
};

describe("DestinationDetails", () => {
  const recommendation = getRecommendations(answers, 12).find(({ destination }) => destination.id === "lisbon-portugal");

  if (!recommendation) throw new Error("Expected Lisbon to exist in the destination data");

  it("renders personalised destination information and its real image", () => {
    render(
      <DestinationDetails
        recommendation={recommendation}
        answers={answers}
        matchLabel="Best match"
        backHref="/results?trip=answers"
        editHref="/planner?trip=answers"
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: /lisbon portugal/i })).toBeInTheDocument();
    expect(screen.getByText(`${recommendation.score}% match`)).toBeInTheDocument();
    expect(screen.getByText("£850 per person")).toBeInTheDocument();
    expect(screen.getByText(/allow around £1,700 for 2 travellers/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: recommendation.destination.image.alt })).toHaveAttribute("src", expect.stringContaining("lisbon.jpg"));
  });

  it("provides routes back to the results and planner answers", () => {
    render(
      <DestinationDetails
        recommendation={recommendation}
        answers={answers}
        matchLabel="Best match"
        backHref="/results?trip=answers"
        editHref="/planner?trip=answers"
      />,
    );

    screen.getAllByRole("link", { name: /back to/i }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/results?trip=answers");
    });
    expect(screen.getByRole("link", { name: /edit trip answers/i })).toHaveAttribute("href", "/planner?trip=answers");
  });
});
