import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SaveDestinationButton } from "./SaveDestinationButton";

const storageKey = "saved-destination-ids";

describe("SaveDestinationButton", () => {
  beforeEach(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent("storage"));
  });

  it("saves and unsaves a destination", async () => {
    render(<SaveDestinationButton destinationId="lisbon-portugal" />);

    fireEvent.click(screen.getByRole("button", { name: "Save destination" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true"));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "[]")).toEqual(["lisbon-portugal"]);

    fireEvent.click(screen.getByRole("button", { name: "Saved" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Save destination" })).toHaveAttribute("aria-pressed", "false"));
    expect(JSON.parse(localStorage.getItem(storageKey) ?? "[]")).toEqual([]);
  });

  it("recovers from invalid saved data", () => {
    localStorage.setItem(storageKey, "not valid JSON");

    render(<SaveDestinationButton destinationId="lisbon-portugal" />);

    expect(screen.getByRole("button", { name: "Save destination" })).toBeInTheDocument();
  });
});
