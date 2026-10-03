import { GoogleSigninBtn } from "@/features/auth";
import { ArrowLeft, Heart, LockKeyhole, UserRound, Sparkles } from "lucide-react";
import Image from "next/image";
import { CancelSignInLink } from "@/features/auth/ui/CancelSignInLink";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen bg-background pt-16 lg:grid-cols-[1.05fr_0.95fr]">
      <section aria-label="Why sign in" className="relative hidden overflow-hidden bg-secondary/20 px-8 py-12 lg:flex lg:flex-col xl:px-14">
        <CancelSignInLink className="inline-flex min-h-11 w-fit items-center gap-2 rounded-lg px-2 text-sm text-text/70 transition hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to exploring
        </CancelSignInLink>

        <div className="flex flex-1 flex-col items-center justify-center py-8">
          <Image
            src="/images/home/destination-card-stack.png"
            alt="Overlapping travel photographs of the Split coastline and Lisbon rooftops"
            width={1536}
            height={1024}
            priority
            sizes="(min-width: 1280px) 48vw, 52vw"
            className="h-auto w-full max-w-2xl object-contain"
          />

          <ul className="mt-8 grid w-full max-w-2xl gap-3 xl:grid-cols-3">
            <li className="flex items-center gap-3 rounded-2xl bg-background/70 p-4 text-sm text-text backdrop-blur">
              <Heart aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              Keep every favourite
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background/70 p-4 text-sm text-text backdrop-blur">
              <UserRound aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              Your Google profile
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-background/70 p-4 text-sm text-text backdrop-blur">
              <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
              Build your shortlist
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="sign-in-heading" className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:py-16">
        <div className="w-full max-w-md">
          <CancelSignInLink className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-text/70 transition hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to exploring
          </CancelSignInLink>

          <div className="rounded-3xl border border-primary/20 bg-background p-6 shadow-xl shadow-primary/10 sm:p-8">
            <span className="mb-8 block text-lg font-semibold tracking-tight text-text">WhereNext</span>

            <h1 id="sign-in-heading" className="text-3xl font-bold tracking-tight text-text sm:text-4xl">
              Welcome to WhereNext
            </h1>

            <p className="mt-4 leading-7 text-text/70">Create an account or sign in with Google to access your WhereNext profile.</p>

            <GoogleSigninBtn />

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-secondary/20 p-4 text-sm leading-6 text-text/70">
              <LockKeyhole aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <p>WhereNext uses Google to verify your identity and never receives or stores your Google password.</p>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-text/50">By continuing, you agree to the Terms of Service and Privacy Policy.</p>
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-text/60">
            <LockKeyhole aria-hidden="true" className="h-4 w-4" />
            Your sign-in is secured by Google.
          </p>
        </div>
      </section>
    </main>
  );
}
