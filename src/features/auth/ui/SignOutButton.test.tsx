import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signOut } from "@/shared/lib/auth/auth-client";
import { toast } from "sonner";
import { SignOutButton } from "./SignOutButton";

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

jest.mock("@/shared/lib/auth/auth-client", () => ({
  signOut: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockedSignOut = jest.mocked(signOut);
const mockedToast = jest.mocked(toast);

describe("SignOutButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("signs the user out and confirms success", async () => {
    mockedSignOut.mockResolvedValue({ data: { success: true }, error: null });

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    await waitFor(() => expect(mockedToast.success).toHaveBeenCalledWith("You've been signed out."));
    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows an error when signing out fails", async () => {
    mockedSignOut.mockResolvedValue({
      data: null,
      error: {
        status: 500,
        statusText: "Internal Server Error",
        message: "Unable to sign out",
      },
    });

    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith("We couldn't sign you out. Please try again."));
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
