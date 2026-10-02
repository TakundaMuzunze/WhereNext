import { auth } from "@/shared/lib/auth/auth";
import { AccountDetails } from "@/widgets/account-details";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AccountPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 pt-28 pb-20">
      <header className="mb-9">
        <p className="text-sm tracking-widest text-accent uppercase">Account settings</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-text sm:text-5xl">Your account.</h1>
        <p className="mt-3 max-w-2xl text-text/70">Review your profile, sign-in details and the places you’ve saved for later.</p>
      </header>

      <AccountDetails user={session.user} />
    </main>
  );
}
