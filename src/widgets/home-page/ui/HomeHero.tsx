import { ArrowRight, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function HomeHero() {
  return (
    <section aria-labelledby="home-hero-heading" className="w-full px-6 pt-32 pb-20 sm:pt-36 lg:pt-40 lg:pb-28">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="flex flex-col items-start gap-6">
          <span className="w-fit rounded-xl bg-secondary px-3 py-2 text-sm tracking-widest text-text uppercase">
            Personalised travel recommendations
          </span>

          <h1 id="home-hero-heading" className="max-w-2xl text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
            Where should you go next?
          </h1>

          <p className="max-w-xl text-lg leading-8 text-text/75">
            Share the essentials. Get a focused shortlist of destinations that fit your time, budget, and travel style.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/planner"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-lg text-white transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary dark:text-[#101214]"
            >
              Start planning
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </Link>

            <Link
              href="#how-it-works"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-secondary/50 px-6 py-3 text-lg text-text transition hover:bg-secondary/70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              How it works
            </Link>
          </div>

          <div className="flex items-center gap-2 text-text/80">
            <Sparkles aria-hidden="true" className="h-5 w-5 shrink-0" />
            <p>No endless lists. Just a focused shortlist.</p>
          </div>
        </div>

        <figure>
          <Image
            src="/images/home/destination-card-stack.png"
            alt="Overlapping travel photographs of the Split coastline and Lisbon rooftops"
            width={1536}
            height={1024}
            priority
            sizes="(min-width: 1024px) 42vw, (min-width: 640px) 80vw, calc(100vw - 3rem)"
            className="h-auto w-full object-contain"
          />
          <figcaption className="sr-only">Split, Croatia in front of Lisbon, Portugal</figcaption>
        </figure>
      </div>
    </section>
  );
}
