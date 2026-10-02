import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signOut, useSession } = authClient;

export const signInWithGoogle = () =>
  authClient.signIn.social({
    provider: "google",
    callbackURL: "/?signedIn=true",
  });
