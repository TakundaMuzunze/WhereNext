import { render, screen } from "@testing-library/react";
import { auth } from "@/shared/lib/auth/auth";
import { redirect } from "next/navigation";
import AccountPage from "./page";

jest.mock("@/shared/lib/auth/auth", () => ({ auth: { api: { getSession: jest.fn() } } }));
jest.mock("next/headers", () => ({ headers: jest.fn(async () => new Headers()) }));
jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("redirect");
  }),
}));
jest.mock("@/widgets/account-details", () => ({ AccountDetails: ({ user }: { user: { name: string } }) => <div>{user.name}</div> }));

beforeEach(() => jest.clearAllMocks());

it("redirects signed-out visitors before rendering account details", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue(null);
  await expect(AccountPage()).rejects.toThrow("redirect");
  expect(redirect).toHaveBeenCalledWith("/sign-in");
});

it("renders the verified session user's account", async () => {
  jest.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "user-1", name: "Test Traveller", email: "test@example.com", emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    session: {
      id: "session-1",
      userId: "user-1",
      token: "test-token",
      expiresAt: new Date(Date.now() + 60000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  render(await AccountPage());
  expect(screen.getByText("Test Traveller")).toBeInTheDocument();
  expect(redirect).not.toHaveBeenCalled();
});
