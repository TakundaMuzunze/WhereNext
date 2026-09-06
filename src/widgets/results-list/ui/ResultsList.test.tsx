import type { PlannerAnswers } from "@/entities/trip/model/types";
import { getRecommendations } from "@/features/destination-matching";
import { render, screen } from "@testing-library/react";
import { ResultsList } from "./ResultsList";

const answers: PlannerAnswers = {
  departure: "London",
  travelMonth: "June",
  duration: 5,
  budget: 2200,
  travellers: 2,
  tripType: "city-break",
  activities: ["Architecture", "Food markets"],
};

describe("ResultsList", () => {
  it("links each result to its destination page while preserving the planner answers", () => {
    const recommendations = getRecommendations(answers, 1);

    render(<ResultsList recommendations={recommendations} answers={answers} />);

    const detailsLink = screen.getByRole("link", { name: /view destination/i });
    const destinationId = recommendations[0].destination.id;

    expect(detailsLink).toHaveAttribute(
      "href",
      `/destinations/${destinationId}?departure=London&month=June&duration=5&budget=2200&travellers=2&tripType=city-break&activity=Architecture&activity=Food+markets`,
    );
  });

  it("shows a helpful message when no destinations match", () => {
    render(<ResultsList recommendations={[]} answers={answers} />);

    expect(screen.getByText(/no destination matches were found/i)).toBeInTheDocument();
  });
});
