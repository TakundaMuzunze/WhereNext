import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signOut, useSession } from "@/shared/lib/auth/auth-client";
import { SigninBtn } from "./SigninBtn";

jest.mock("@/shared/lib/auth/auth-client", () => ({
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);
const mockedSignOut = jest.mocked(signOut);

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

describe("SigninBtn", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("links signed-out users to the sign-in page", () => {
    mockedUseSession.mockReturnValue({ data: null, isPending: false } as ReturnType<typeof useSession>);

    render(<SigninBtn />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });

  it("keeps the account routes and sign-out behaviour available", async () => {
    mockedSignOut.mockResolvedValue({ data: { success: true }, error: null });
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Takunda Muzunze",
          email: "takunda@example.com",
          emailVerified: true,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        session: {
          id: "session-1",
          userId: "user-1",
          token: "token",
          expiresAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      isPending: false,
    } as ReturnType<typeof useSession>);

    render(<SigninBtn />);
    fireEvent.click(screen.getByRole("button", { name: /open account menu/i }));

    expect(screen.getByRole("link", { name: "Saved destinations" })).toHaveAttribute("href", "/saved");
    expect(screen.getByRole("link", { name: "Account settings" })).toHaveAttribute("href", "/account");

    fireEvent.keyDown(screen.getByRole("link", { name: "Account settings" }), { key: "Escape" });
    expect(screen.queryByRole("link", { name: "Account settings" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /open account menu/i });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(mockedSignOut).toHaveBeenCalledTimes(1));
  });
});
