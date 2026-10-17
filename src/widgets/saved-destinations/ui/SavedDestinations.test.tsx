import { fireEvent, render, screen, within } from "@testing-library/react";
import { ShortlistBrowser, useShortlists } from "@/features/shortlists";
import { SavedDestinations } from "./SavedDestinations";

jest.mock("@/features/shortlists/model/ShortlistsProvider", () => ({ useShortlists: jest.fn() }));
const mockSession = jest.fn();
jest.mock("@/shared/lib/auth/auth-client", () => ({ useSession: () => mockSession() }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockReturnValue({ data: { user: { id: "owner" } }, isPending: false });
  jest.mocked(useShortlists).mockReturnValue({
    shortlists: [],
    destinationIds: [],
    isLoading: false,
    error: null,
    busy: false,
    retry: jest.fn(),
    refresh: jest.fn(),
    isSaved: () => false,
    openPicker: jest.fn(),
    create: jest.fn().mockResolvedValue(undefined),
    rename: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    submit: jest.fn().mockResolvedValue(undefined),
  });
});
it("shows an empty overview and supports creating an empty shortlist", async () => {
  render(<SavedDestinations />);
  expect(screen.getByRole("heading", { name: "No shortlists yet" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Create shortlist" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Shortlist name"), { target: { value: "  Ideas  " } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Create shortlist" }));
  expect(useShortlists().create).toHaveBeenCalledWith("Ideas");
});
it("shows names, counts, and empty shortlists", () => {
  jest.mocked(useShortlists).mockReturnValue({
    ...useShortlists(),
    shortlists: [
      { id: "a", name: "Summer", destinationIds: ["lisbon-portugal"] },
      { id: "b", name: "Winter", destinationIds: [] },
    ],
  });
  render(<SavedDestinations />);
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getByRole("link", { name: "Summer" })).toHaveAttribute("href", "/saved/a");
  expect(screen.getByText("0 destinations")).toBeInTheDocument();
});
it("distinguishes loading and errors from empty lists", () => {
  const state = useShortlists();
  jest.mocked(useShortlists).mockReturnValue({ ...state, isLoading: true });
  const rendered = render(<SavedDestinations />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  jest.mocked(useShortlists).mockReturnValue({ ...state, error: "Unable to load" });
  rendered.rerender(<SavedDestinations />);
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(state.retry).toHaveBeenCalled();
});
it("hides private data when signed out", () => {
  mockSession.mockReturnValue({ data: null, isPending: false });
  render(<SavedDestinations />);
  expect(screen.getByRole("heading", { name: "Sign in to view your shortlists" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fsaved");
});
it("explains deletion consequences before writing and keeps other lists intact", async () => {
  jest.mocked(useShortlists).mockReturnValue({
    ...useShortlists(),
    shortlists: [
      { id: "a", name: "Summer", destinationIds: ["lisbon-portugal", "other"] },
      { id: "b", name: "Winter", destinationIds: ["lisbon-portugal"] },
    ],
  });
  render(<ShortlistBrowser shortlistId="a" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete shortlist" }));
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveTextContent("1 destination is saved only here");
  expect(useShortlists().remove).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete shortlist" }));
  expect(useShortlists().remove).toHaveBeenCalledWith("a");
});
it("removes only the selected shortlist membership", () => {
  jest.mocked(useShortlists).mockReturnValue({ ...useShortlists(), shortlists: [{ id: "a", name: "Summer", destinationIds: ["lisbon-portugal"] }] });
  render(<ShortlistBrowser shortlistId="a" />);
  fireEvent.click(screen.getByRole("button", { name: "Remove Lisbon from this shortlist" }));
  expect(useShortlists().submit).toHaveBeenCalledWith({ destinationId: "lisbon-portugal", addTo: [], removeFrom: ["a"] });
});
it("validates names before sending changes", () => {
  render(<SavedDestinations />);
  fireEvent.click(screen.getByRole("button", { name: "Create shortlist" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Create shortlist" }));
  expect(screen.getByRole("alert")).toHaveTextContent("between 1 and 80");
  expect(useShortlists().create).not.toHaveBeenCalled();
});
