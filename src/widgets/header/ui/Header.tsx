import { SignInToast, SigninBtn } from "@/features/auth";
import { SavedDestinationsLink } from "@/features/saved-destinations";
import { ThemeToggle } from "@/features/theme-toggle";
import Link from "next/link";
import { Suspense } from "react";

export function Header() {
  return (
    <header className="fixed top-0 left-0 z-50 w-full border-b border-primary/20 bg-background/80 text-text backdrop-blur">
      <div className="mx-auto flex flex-row items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-normal">
          WhereNext
        </Link>

        <div className="flex items-center gap-4">
          <SavedDestinationsLink />
          <SigninBtn />
          <Suspense fallback={null}>
            <SignInToast />
          </Suspense>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
