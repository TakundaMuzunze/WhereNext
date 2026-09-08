import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SavedDestinations } from "./SavedDestinations";

const storageKey = "saved-destination-ids";

describe("SavedDestinations", () => {
  beforeEach(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage"));
  });

  it("shows an empty state when no destinations are saved", () => {
    render(<SavedDestinations />);

    expect(screen.getByRole("heading", { name: "No saved destinations yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore destinations" })).toHaveAttribute("href", "/planner");
  });

  it("renders valid saved destinations and lets the user remove them", async () => {
    localStorage.setItem(storageKey, JSON.stringify(["lisbon-portugal", "unknown-destination"]));
    render(<SavedDestinations />);

    expect(await screen.findByRole("heading", { name: /lisbon portugal/i })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Remove Lisbon from saved destinations" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "No saved destinations yet" })).toBeInTheDocument());
  });
});
