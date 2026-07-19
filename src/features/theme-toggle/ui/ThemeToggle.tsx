"use client";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.classList.contains("dark") ? "light" : "dark";

    root.classList.toggle("dark", nextTheme === "dark");
    localStorage.setItem("theme", nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle colour theme"
      className="relative inline-flex h-8 w-14 items-center rounded-full border border-primary/20 bg-secondary/25 p-1 transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-secondary/50"
    >
      <span className="flex size-6 translate-x-0 items-center justify-center rounded-full bg-background text-xs shadow-sm transition-transform duration-300 ease-in-out dark:translate-x-6">
        <span className="dark:hidden" aria-hidden="true">
          🌙
        </span>
        <span className="hidden dark:inline" aria-hidden="true">
          ☀️
        </span>
      </span>
    </button>
  );
}
