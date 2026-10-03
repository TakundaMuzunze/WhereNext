// Only allow paths within this app, never external redirect destinations.
export function getSafeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return "/";

  const base = "https://where-next.invalid";
  try {
    const url = new URL(value, base);
    if (
      url.origin !== base ||
      (!["/", "/planner", "/results", "/saved", "/account"].includes(url.pathname) && !url.pathname.startsWith("/destinations/"))
    ) {
      return "/";
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}
