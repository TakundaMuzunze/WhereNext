import { render, screen } from "@testing-library/react";
import { AccountDetails } from "./AccountDetails";

jest.mock("@/features/auth", () => ({
  SignOutButton: () => <button type="button">Sign out</button>,
  UserAvatar: ({ name }: { name: string }) => <span>{name} avatar</span>,
}));

describe("AccountDetails", () => {
  it("shows the authenticated user's profile and account actions", () => {
    render(
      <AccountDetails
        user={{
          name: "Takunda Muzunze",
          email: "takunda@example.com",
          emailVerified: true,
          image: null,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Takunda Muzunze" })).toBeInTheDocument();
    expect(screen.getByText("takunda@example.com")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View saved destinations" })).toHaveAttribute("href", "/saved");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
