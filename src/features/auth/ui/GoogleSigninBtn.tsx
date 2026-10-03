"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { signInWithGoogle } from "@/shared/lib/auth/auth-client";

import { clearPendingSave } from "@/shared/lib/auth/signInJourney";

export function GoogleSigninBtn() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("authError")) {
      clearPendingSave();
      toast.error("Sign-in was cancelled or unsuccessful. Please try again.");
    }
  }, []);

  async function handleSignIn() {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      const returnTo = new URLSearchParams(window.location.search).get("returnTo");
      const journeyId = new URLSearchParams(window.location.search).get("saveJourney");
      const result = await signInWithGoogle(returnTo, journeyId);
      if (result.error) {
        clearPendingSave();
        toast.error("We couldn't start Google sign-in. Please try again.");
        setIsSigningIn(false);
      }
    } catch {
      clearPendingSave();
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
