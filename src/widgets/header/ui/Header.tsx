import { ThemeToggle } from "@/features/theme-toggle";
import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-primary/20 bg-background/80 text-text backdrop-blur">
      <div className="mx-auto flex flex-row items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-normal">
          WhereNext
        </Link>

        {/* <Link
          href="/planner"
          className="rounded-xl border-2 border-secondary bg-secondary px-4 py-2 text-sm font-normal text-text transition hover:bg-accent"
        >
          Sign in
        </Link> */}

        <ThemeToggle />
      </div>
    </header>
  );
}
