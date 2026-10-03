import { StrictMode } from "react";
import { googleCallbacks, signInHref } from "@/shared/lib/auth/signInJourney";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSession } from "@/shared/lib/auth/auth-client";
import { toast } from "sonner";
import { SavedDestinationsProvider } from "../model/SavedDestinationsProvider";
import { getSavedDestinations, removeDestination, saveDestination } from "../api/saveDestinations";
import { SaveDestinationButton } from "./SaveDestinationButton";

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock("next/navigation", () => ({ useRouter: () => mockRouter }));
jest.mock("@/shared/lib/auth/auth-client", () => ({ useSession: jest.fn() }));
jest.mock("../api/saveDestinations", () => ({
  ...jest.requireActual("../api/saveDestinations"),
  saveDestination: jest.fn(),
  getSavedDestinations: jest.fn(),
  removeDestination: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockedSave = jest.mocked(saveDestination);
const mockedSession = jest.mocked(useSession);
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

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  mockedSession.mockReturnValue(sessionState);
  jest.mocked(getSavedDestinations).mockResolvedValue([]);
  window.history.replaceState({}, "", "/results?month=June");
});

it("redirects guests without making a save request", async () => {
  mockedSession.mockReturnValue({ ...sessionState, data: null });
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Save destination" }));
  expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/sign-in\?returnTo=%2Fresults%3Fmonth%3DJune&saveJourney=.+/));
  expect(mockedSave).not.toHaveBeenCalled();
});

it("waits for confirmation and prevents duplicate clicks", async () => {
  let finish: (result: "saved") => void = () => {};
  mockedSave.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Save destination" }));
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
  expect(mockedSave).toHaveBeenCalledTimes(1);
  finish("saved");
  await waitFor(() => expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true"));
});

it("redirects expired sessions back through sign-in", async () => {
  mockedSave.mockResolvedValue("unauthorised");
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Save destination" }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  expect(toast.success).not.toHaveBeenCalled();
});

it("shows failures and allows retrying", async () => {
  mockedSave.mockRejectedValue(new Error("Offline"));
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Save destination" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Save destination" })).toBeEnabled();
});

it("does not retain another session's saved confirmation", async () => {
  mockedSave.mockResolvedValue("saved");
  const { rerender } = render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Save destination" }));
  await screen.findByRole("button", { name: "Saved" });
  mockedSession.mockReturnValue({ ...sessionState, data: null });
  rerender(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  expect(screen.getByRole("button", { name: "Save destination" })).toHaveAttribute("aria-pressed", "false");
});

it("loads saved state and removes it only after server confirmation", async () => {
  jest.mocked(getSavedDestinations).mockResolvedValue(["lisbon-portugal"]);
  jest.mocked(removeDestination).mockResolvedValue("removed");
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  await screen.findByRole("button", { name: "Save destination" });
  expect(removeDestination).toHaveBeenCalledWith("lisbon-portugal");
});
it("keeps the save when removal fails", async () => {
  jest.mocked(getSavedDestinations).mockResolvedValue(["lisbon-portugal"]);
  jest.mocked(removeDestination).mockRejectedValue(new Error("Offline"));
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Saved" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
});

it("allows retrying a failed list load without pretending it is empty", async () => {
  jest.mocked(getSavedDestinations).mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(["lisbon-portugal"]);
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Retry saved destinations" }));
  await screen.findByRole("button", { name: "Saved" });
  expect(mockedSave).not.toHaveBeenCalled();
});

function returnFromGoogle() {
  const href = signInHref("/results?month=June", "lisbon-portugal");
  const id = new URL(href, window.location.origin).searchParams.get("saveJourney");
  window.history.replaceState({}, "", googleCallbacks("/results?month=June", id).callbackURL);
}
it("automatically saves once after the matching login, including StrictMode and remount", async () => {
  returnFromGoogle();
  mockedSave.mockResolvedValue("saved");
  const view = () => (
    <StrictMode>
      <SavedDestinationsProvider>
        <SaveDestinationButton destinationId="lisbon-portugal" />
      </SavedDestinationsProvider>
    </StrictMode>
  );
  const rendered = render(view());
  await screen.findByRole("button", { name: "Saved" });
  expect(mockedSave).toHaveBeenCalledTimes(1);
  rendered.unmount();
  render(view());
  await screen.findByRole("button", { name: "Save destination" });
  expect(mockedSave).toHaveBeenCalledTimes(1);
});
it("leaves an unsuccessful resumed save available for manual retry", async () => {
  returnFromGoogle();
  mockedSave.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce("saved");
  render(
    <SavedDestinationsProvider>
      <SaveDestinationButton destinationId="lisbon-portugal" />
    </SavedDestinationsProvider>,
  );
  const button = await screen.findByRole("button", { name: "Save destination" });
  expect(toast.error).toHaveBeenCalledWith("You’re signed in, but we couldn’t save this destination. Please try again.");
  expect(sessionStorage.length).toBe(0);
  fireEvent.click(button);
  await screen.findByRole("button", { name: "Saved" });
});
