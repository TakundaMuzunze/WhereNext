import { StrictMode } from "react";
import { googleCallbacks, signInHref } from "@/shared/lib/auth/signInJourney";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useSession } from "@/shared/lib/auth/auth-client";
import { SavedDestinationsProvider } from "../model/SavedDestinationsProvider";
import { changeMemberships, getShortlists, ShortlistsError } from "@/features/shortlists/api/shortlists";
import { SaveDestinationButton } from "./SaveDestinationButton";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
jest.mock("@/shared/lib/auth/auth-client", () => ({ useSession: jest.fn() }));
jest.mock("@/features/shortlists/api/shortlists", () => ({
  ...jest.requireActual("@/features/shortlists/api/shortlists"),
  getShortlists: jest.fn(),
  changeMemberships: jest.fn(),
}));
const sessionState: ReturnType<typeof useSession> = {
  data: {
    user: { id: "user-1", name: "Traveller", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: { id: "session-1", userId: "user-1", token: "test", expiresAt: new Date(), createdAt: new Date(), updatedAt: new Date() },
  },
  isPending: false,
  isRefetching: false,
  error: null,
  refetch: jest.fn(),
};
const destinationId = "lisbon-portugal";
const lists = [
  { id: "a", name: "Summer", destinationIds: [destinationId] },
  { id: "b", name: "Winter", destinationIds: [] },
];
function view() {
  return (
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId={destinationId} />
    </SavedDestinationsProvider>
  );
}
async function open(saved = false) {
  fireEvent.click(await screen.findByRole("button", { name: saved ? "Saved" : "Save destination" }));
  return screen.findByRole("dialog");
}

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
  sessionStorage.clear();
  jest.mocked(useSession).mockReturnValue(sessionState);
  jest.mocked(getShortlists).mockReset().mockResolvedValue([]);
  jest
    .mocked(changeMemberships)
    .mockReset()
    .mockResolvedValue({ destinationId, shortlistIds: ["new"], createdShortlist: { id: "new", name: "Portugal", destinationIds: [destinationId] } });
  window.history.replaceState({}, "", "/results?month=June");
});
it("redirects guests to sign-in without writing", async () => {
  jest.mocked(useSession).mockReturnValue({ ...sessionState, data: null });
  render(view());
  fireEvent.click(screen.getByRole("button", { name: "Save destination" }));
  expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/sign-in\?returnTo=%2Fresults%3Fmonth%3DJune&saveJourney=.+/));
  expect(changeMemberships).not.toHaveBeenCalled();
});
it("keeps first-save creation pending until confirmation", async () => {
  render(view());
  const dialog = await open();
  fireEvent.change(within(dialog).getByLabelText("Shortlist name"), { target: { value: "Portugal" } });
  expect(changeMemberships).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await screen.findByRole("button", { name: "Saved" });
  expect(changeMemberships).toHaveBeenCalledWith({ destinationId, addTo: [], removeFrom: [], createName: "Portugal" });
});
it("cancels draft memberships and discards a draft name without writes", async () => {
  jest.mocked(getShortlists).mockResolvedValue(lists);
  render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByLabelText(/Summer/));
  fireEvent.click(within(dialog).getByLabelText("Create a new shortlist"));
  fireEvent.change(within(dialog).getByLabelText("Shortlist name"), { target: { value: "Discard me" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(changeMemberships).not.toHaveBeenCalled();
  const reopened = await open(true);
  expect(within(reopened).getByLabelText(/Summer/)).toBeChecked();
  expect(within(reopened).queryByLabelText("Shortlist name")).not.toBeInTheDocument();
});
it("sends only membership differences and keeps Saved when another membership remains", async () => {
  jest.mocked(getShortlists).mockResolvedValue(lists);
  jest.mocked(changeMemberships).mockResolvedValue({ destinationId, shortlistIds: ["b"] });
  render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByLabelText(/Summer/));
  fireEvent.click(within(dialog).getByLabelText(/Winter/));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(changeMemberships).toHaveBeenCalledWith({ destinationId, addTo: ["b"], removeFrom: ["a"] });
  expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
});
it("keeps the draft after failure and prevents duplicate submissions", async () => {
  let reject: (error: Error) => void = () => {};
  jest.mocked(changeMemberships).mockImplementationOnce(
    () =>
      new Promise((_, failure) => {
        reject = failure;
      }),
  );
  render(view());
  const dialog = await open();
  fireEvent.change(within(dialog).getByLabelText("Shortlist name"), { target: { value: "Portugal" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  expect(within(dialog).getByRole("button", { name: "Saving…" })).toBeDisabled();
  await act(async () => reject(new Error("Offline")));
  expect(within(dialog).getByRole("alert")).toHaveTextContent("Offline");
  expect(within(dialog).getByLabelText("Shortlist name")).toHaveValue("Portugal");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await screen.findByRole("button", { name: "Saved" });
  expect(changeMemberships).toHaveBeenCalledTimes(2);
});
it("refreshes stale lists while retaining surviving pending choices", async () => {
  jest
    .mocked(getShortlists)
    .mockResolvedValueOnce(lists)
    .mockResolvedValueOnce([{ ...lists[1] }, { id: "c", name: "Other tab", destinationIds: [destinationId] }]);
  jest.mocked(changeMemberships).mockRejectedValueOnce(new ShortlistsError(404, "Refresh your shortlists."));
  render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByLabelText(/Summer/));
  fireEvent.click(within(dialog).getByLabelText(/Winter/));
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await within(dialog).findByRole("alert");
  expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Refresh shortlists" }));
  await waitFor(() => expect(within(dialog).queryByLabelText(/Summer/)).not.toBeInTheDocument());
  expect(within(dialog).getByLabelText(/Winter/)).toBeChecked();
  expect(within(dialog).getByLabelText(/Other tab/)).toBeChecked();
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(changeMemberships).toHaveBeenLastCalledWith({ destinationId, addTo: ["b"], removeFrom: [] }));
});
it("removes the final membership only on confirmation", async () => {
  jest.mocked(getShortlists).mockResolvedValue(lists);
  jest.mocked(changeMemberships).mockResolvedValue({ destinationId, shortlistIds: [] });
  render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByLabelText(/Summer/));
  expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await screen.findByRole("button", { name: "Save destination" });
});
it("resumes the picker once after sign-in without automatically saving, including StrictMode", async () => {
  const href = signInHref("/results?month=June", destinationId);
  const id = new URL(href, window.location.origin).searchParams.get("saveJourney");
  window.history.replaceState({}, "", googleCallbacks("/results?month=June", id).callbackURL);
  const rendered = render(<StrictMode>{view()}</StrictMode>);
  const dialog = await screen.findByRole("dialog");
  expect(changeMemberships).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  rendered.unmount();
  render(view());
  await screen.findByRole("button", { name: "Save destination" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(changeMemberships).not.toHaveBeenCalled();
});
it("clears private data and the open picker when switching accounts", async () => {
  jest.mocked(getShortlists).mockResolvedValueOnce(lists).mockResolvedValue([]);
  const rendered = render(view());
  await open(true);
  jest
    .mocked(useSession)
    .mockReturnValue({ ...sessionState, data: { ...sessionState.data!, session: { ...sessionState.data!.session, id: "other-session" } } });
  rendered.rerender(view());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await screen.findByRole("button", { name: "Save destination" });
});
it("redirects an expired session and clears private memberships", async () => {
  jest.mocked(getShortlists).mockResolvedValue(lists);
  jest.mocked(changeMemberships).mockRejectedValue(new ShortlistsError(401, "Please sign in again."));
  render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("retries a failed initial load", async () => {
  jest.mocked(getShortlists).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(lists);
  render(view());
  fireEvent.click(await screen.findByRole("button", { name: "Retry shortlists" }));
  await screen.findByRole("button", { name: "Saved" });
});

it("waits for the active StrictMode load before resuming with existing memberships", async () => {
  const href = signInHref("/results?month=June", destinationId);
  const id = new URL(href, window.location.origin).searchParams.get("saveJourney");
  window.history.replaceState({}, "", googleCallbacks("/results?month=June", id).callbackURL);
  jest.mocked(getShortlists).mockResolvedValue(lists);
  render(<StrictMode>{view()}</StrictMode>);
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText(/Summer/)).toBeChecked();
  expect(within(dialog).getByLabelText("Create a new shortlist")).not.toBeChecked();
  expect(changeMemberships).not.toHaveBeenCalled();
});
it("keeps the pending picker intent available when the post-sign-in load fails", async () => {
  const href = signInHref("/results?month=June", destinationId);
  const id = new URL(href, window.location.origin).searchParams.get("saveJourney");
  window.history.replaceState({}, "", googleCallbacks("/results?month=June", id).callbackURL);
  jest.mocked(getShortlists).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(lists);
  render(view());
  fireEvent.click(await screen.findByRole("button", { name: "Retry shortlists" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByLabelText(/Summer/)).toBeChecked();
  expect(changeMemberships).not.toHaveBeenCalled();
});
it("ignores a mutation response that arrives after sign-out", async () => {
  let finish: (result: Awaited<ReturnType<typeof changeMemberships>>) => void = () => {};
  jest.mocked(getShortlists).mockResolvedValue(lists);
  jest.mocked(changeMemberships).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const rendered = render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  jest.mocked(useSession).mockReturnValue({ ...sessionState, data: null });
  rendered.rerender(view());
  await act(async () => finish({ destinationId, shortlistIds: ["a"] }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save destination" })).toHaveAttribute("aria-pressed", "false");
});
it("loads memberships created in another tab instead of mistaking them for the picker-created list", async () => {
  jest
    .mocked(getShortlists)
    .mockResolvedValueOnce(lists)
    .mockResolvedValueOnce([
      ...lists,
      { id: "c", name: "Another tab", destinationIds: [destinationId] },
      { id: "new", name: "Portugal", destinationIds: [destinationId] },
    ]);
  jest.mocked(changeMemberships).mockResolvedValue({
    destinationId,
    shortlistIds: ["a", "c", "new"],
    createdShortlist: { id: "new", name: "Portugal", destinationIds: [destinationId] },
  });
  render(view());
  const dialog = await open(true);
  fireEvent.click(within(dialog).getByLabelText("Create a new shortlist"));
  fireEvent.change(within(dialog).getByLabelText("Shortlist name"), { target: { value: "Portugal" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  const reopened = await open(true);
  expect(within(reopened).getByLabelText(/Another tab/)).toBeChecked();
  expect(within(reopened).getByLabelText(/Portugal/)).toBeChecked();
});
