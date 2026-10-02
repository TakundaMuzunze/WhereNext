"use client";

import { signOut } from "@/shared/lib/auth/auth-client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type SignOutButtonProps = {
  variant?: "menu" | "account";
};

export function SignOutButton({ variant = "menu" }: SignOutButtonProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      const result = await signOut();

      if (result.error) {
        toast.error("We couldn't sign you out. Please try again.");
        return;
      }

      toast.success("You've been signed out.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("We couldn't sign you out. Please try again.");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={
        variant === "menu"
          ? "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-text transition hover:bg-secondary/20 focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
          : "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/25 px-5 py-2.5 text-sm font-medium text-text transition hover:border-primary/45 hover:bg-secondary/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      }
    >
      <LogOut className="h-4 w-4 text-text/70" aria-hidden="true" />
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
