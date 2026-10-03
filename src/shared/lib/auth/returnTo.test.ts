import { getSafeReturnTo } from "./returnTo";

it("preserves an app path, planner parameters and fragment", () => {
  expect(getSafeReturnTo("/results?month=June#lisbon")).toBe("/results?month=June#lisbon");
});

it.each([null, "https://evil.example", "//evil.example", "/\\evil.example", "/api/auth/sign-out", "/sign-in", "/results\n"])(
  "falls back home for unsafe or unsupported return paths: %s",
  (value) => {
    expect(getSafeReturnTo(value)).toBe("/");
  },
);
