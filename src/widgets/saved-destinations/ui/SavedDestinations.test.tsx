import { fireEvent, render, screen } from "@testing-library/react";
import { useSavedDestinations } from "@/features/saved-destinations";
import { SavedDestinations } from "./SavedDestinations";

jest.mock("@/features/saved-destinations", () => ({ useSavedDestinations: jest.fn() }));
const mockSession = jest.fn();
jest.mock("@/shared/lib/auth/auth-client", () => ({ useSession: () => mockSession() }));
const unsave = jest.fn();
const retry = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockReturnValue({ data: { user: { id: "user-1" } }, isPending: false });
  jest.mocked(useSavedDestinations).mockReturnValue({
    destinationIds: [],
    isLoading: false,
    error: null,
    retry,
    isSaved: () => false,
    isUpdating: () => false,
    save: jest.fn(),
    unsave,
  });
});
it("shows an empty state after loading", () => {
  render(<SavedDestinations />);
  expect(screen.getByRole("heading", { name: "No saved destinations yet" })).toBeInTheDocument();
});
it("renders server order and sends removal to the shared hook", () => {
  jest
    .mocked(useSavedDestinations)
    .mockReturnValue({ ...jest.mocked(useSavedDestinations)(), destinationIds: ["lisbon-portugal", "unknown-destination"] });
  render(<SavedDestinations />);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Remove Lisbon from saved destinations" }));
  expect(unsave).toHaveBeenCalledWith("lisbon-portugal");
});
it("distinguishes loading and failures from an empty list", () => {
  const state = jest.mocked(useSavedDestinations)();
  jest.mocked(useSavedDestinations).mockReturnValue({ ...state, isLoading: true });
  const { rerender } = render(<SavedDestinations />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.queryByText("No saved destinations yet")).not.toBeInTheDocument();
  jest.mocked(useSavedDestinations).mockReturnValue({ ...state, error: "Unable to load" });
  rerender(<SavedDestinations />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(retry).toHaveBeenCalled();
});

it("hides saved destinations immediately after sign-out and offers contextual links", () => {
  jest.mocked(useSavedDestinations).mockReturnValue({ ...jest.mocked(useSavedDestinations)(), destinationIds: ["lisbon-portugal"] });
  const { rerender } = render(<SavedDestinations />);
  expect(screen.getAllByRole("article")).toHaveLength(1);
  mockSession.mockReturnValue({ data: null, isPending: false });
  rerender(<SavedDestinations />);
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Sign in to view your saved destinations" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fsaved");
  expect(screen.getByRole("link", { name: "Explore destinations" })).toHaveAttribute("href", "/planner");
});
