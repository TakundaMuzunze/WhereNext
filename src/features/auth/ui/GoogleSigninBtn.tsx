"use client";
import { useState } from "react";
import { toast } from "sonner";
import { signInWithGoogle } from "@/shared/lib/auth/auth-client";

export function GoogleSigninBtn() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSignIn() {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const result = await signInWithGoogle();
      if (result.error) {
        toast.error("We couldn't start Google sign-in. Please try again.");
        setIsSigningIn(false);
      }
    } catch {
      toast.error("We couldn't start Google sign-in. Please try again.");
      setIsSigningIn(false);
    }
  }

  return (
    <button
      type="button"
      className="mt-8 flex min-h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-primary/20 bg-background px-5 py-3 font-medium text-text transition hover:bg-secondary/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      onClick={handleSignIn}
      disabled={isSigningIn}
    >
      <span
        aria-hidden="true"
        className="grid h-6 w-6 place-items-center rounded-full bg-[conic-gradient(#4285f4_0_25%,#34a853_0_50%,#fbbc05_0_75%,#ea4335_0)] text-xs font-bold text-white"
      >
        G
      </span>
      {isSigningIn ? "Connecting to Google…" : "Continue with Google"}
    </button>
  );
}
