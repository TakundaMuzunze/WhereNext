import { SignOutButton, UserAvatar } from "@/features/auth";
import { Bookmark, CheckCircle2, ExternalLink, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";

type AccountUser = {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
};

type AccountDetailsProps = {
  user: AccountUser;
};

export function AccountDetails({ user }: AccountDetailsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
      <section className="overflow-hidden rounded-3xl border border-primary/15 bg-background shadow-sm" aria-labelledby="profile-heading">
        <div className="h-28 bg-linear-to-r from-primary via-accent to-secondary sm:h-36" aria-hidden="true" />

        <div className="px-6 pb-7 sm:px-8 sm:pb-8">
          <div className="-mt-10 sm:-mt-12">
            <UserAvatar image={user.image} name={user.name} email={user.email} size="profile" />
          </div>

          <div className="mt-5">
            <p className="text-xs font-medium tracking-widest text-accent uppercase">Your profile</p>
            <h2 id="profile-heading" className="mt-2 text-3xl font-semibold tracking-tight text-text">
              {user.name}
            </h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-text/65">
              <Mail className="size-4" aria-hidden="true" />
              {user.email}
            </p>
          </div>

          <div className="mt-7 rounded-2xl bg-secondary/15 p-4 sm:flex sm:items-start sm:justify-between sm:gap-6">
            <div className="flex gap-3">
              <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-background text-primary">
                <LockKeyhole className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-medium text-text">Profile managed by Google</h3>
                <p className="mt-1 max-w-xl text-sm leading-6 text-text/65">
                  Your name, email and profile photo come from your Google account. WhereNext never receives your Google password.
                </p>
              </div>
            </div>
            <a
              href="https://myaccount.google.com/personal-info"
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-primary sm:mt-0 sm:shrink-0"
            >
              Manage with Google
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-6" aria-label="Account actions">
        <section className="rounded-3xl border border-primary/15 bg-background p-6 shadow-sm">
          <span className="grid size-11 place-items-center rounded-2xl bg-secondary/20 text-primary">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-text">Account security</h2>
          <dl className="mt-5 grid gap-4 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-primary/10 pb-4">
              <dt className="text-text/60">Sign-in method</dt>
              <dd className="font-medium text-text">Google</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-text/60">Email status</dt>
              <dd className="font-medium text-text">{user.emailVerified ? "Verified" : "Unverified"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-primary/15 bg-background p-6 shadow-sm">
          <Bookmark className="size-5 text-primary" aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-text">Your shortlist</h2>
          <p className="mt-2 text-sm leading-6 text-text/65">Return to the destinations you saved while planning your next trip.</p>
          <Link href="/saved" className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary">
            View saved destinations
          </Link>
        </section>

        <section className="rounded-3xl border border-primary/15 bg-background p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-text">Finished for now?</h2>
          <p className="mt-2 text-sm leading-6 text-text/65">Sign out securely on this device. Your account and saved data will remain available.</p>
          <div className="mt-4">
            <SignOutButton variant="account" />
          </div>
        </section>
      </aside>
    </div>
  );
}
