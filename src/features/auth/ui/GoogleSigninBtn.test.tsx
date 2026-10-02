import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signInWithGoogle } from "@/shared/lib/auth/auth-client";
import { toast } from "sonner";
import { GoogleSigninBtn } from "./GoogleSigninBtn";

jest.mock("@/shared/lib/auth/auth-client", () => ({ signInWithGoogle: jest.fn() }));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const mockedSignIn = jest.mocked(signInWithGoogle);

beforeEach(() => jest.clearAllMocks());

it("prevents repeated requests while redirecting to Google", () => {
  mockedSignIn.mockReturnValue(new Promise(() => {}));
  render(<GoogleSigninBtn />);
  fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
  const button = screen.getByRole("button", { name: "Connecting to Google…" });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(mockedSignIn).toHaveBeenCalledTimes(1);
});

it("shows returned errors and allows retrying", async () => {
  mockedSignIn.mockResolvedValue({ data: null, error: { status: 500, statusText: "Server Error", message: "Failed" } });
  render(<GoogleSigninBtn />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});

it("handles network failures and allows retrying", async () => {
  mockedSignIn.mockRejectedValue(new Error("Network unavailable"));
  render(<GoogleSigninBtn />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
});
