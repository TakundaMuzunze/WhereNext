import { createAuthClient } from "better-auth/react";
import { googleCallbacks } from "./signInJourney";

export const authClient = createAuthClient();

export const { signOut, useSession } = authClient;

export const signInWithGoogle = (returnTo: string | null = null, journeyId: string | null = null) =>
  authClient.signIn.social({
    provider: "google",
    ...googleCallbacks(returnTo, journeyId),
  });
