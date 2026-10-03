import { fireEvent, render, screen } from "@testing-library/react";
import SignInPage from "./page";

jest.mock("@/features/auth", () => ({
  GoogleSigninBtn: () => <button type="button">Continue with Google</button>,
}));

describe("SignInPage", () => {
  it("presents the Google sign-in layout and a route back home", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Welcome to WhereNext" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /back to exploring/i })).toHaveLength(2);
    expect(screen.getByRole("img", { name: /Split coastline and Lisbon rooftops/i })).toBeInTheDocument();
    expect(screen.queryByText(/pick up where you left off/i)).not.toBeInTheDocument();
  });
});

it("cancels pending saves and returns to exploring", () => {
  sessionStorage.setItem("where-next:pending-save", "pending");
  window.history.replaceState({}, "", "/sign-in?returnTo=%2Fresults%3Fmonth%3DJune");
  render(<SignInPage />);
  const link = screen.getAllByRole("link", { name: /back to exploring/i })[0];
  link.addEventListener("click", (event) => event.preventDefault());
  fireEvent.click(link);
  expect(sessionStorage.getItem("where-next:pending-save")).toBeNull();
  expect(link).toHaveAttribute("href", "/results?month=June");
});
