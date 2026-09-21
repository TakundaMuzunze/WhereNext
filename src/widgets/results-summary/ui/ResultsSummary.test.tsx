import type { PlannerAnswers } from "@/entities/trip/model/types";
import { render, screen } from "@testing-library/react";
import { ResultsSummary } from "./ResultsSummary";

const answers: PlannerAnswers = {
  departure: "London",
  travelMonth: "June",
  duration: 5,
  budget: 2200,
  travellers: 2,
  tripType: "city-break",
  activities: ["Architecture"],
};

describe("ResultsSummary", () => {
  it("explains the limits of cost and departure data", () => {
    render(<ResultsSummary answers={answers} />);

    expect(screen.getByText(/costs are broad planning estimates, not live quotes/i)).toBeInTheDocument();
    expect(screen.getByText(/departure is shown for reference and does not currently affect the match ranking/i)).toBeInTheDocument();
  });
});
