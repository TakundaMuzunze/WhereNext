import { Sparkles } from "lucide-react";

export function HomeHero() {
  return (
    <section className="flex min-h-screen w-full items-center justify-center px-6 py-2">
      <div className="flex flex-col gap-6 md:items-center md:justify-center md:text-center">
        <span className="w-fit rounded-xl bg-secondary p-2 text-sm tracking-widest text-text uppercase md:px-3 md:py-2">
          Personalised travel recommendations
        </span>

        <h1 className="text-4xl font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">Where should you go next?</h1>

        <p className="max-w-2xl text-lg text-text">
          Share the essentials. Get a shortlist of destinations that fit your time, budget, and travel style.
        </p>

        <div className="flex flex-wrap gap-4">
          <a
            href="#how-it-works"
            className="rounded-xl border border-slate-300 bg-secondary px-6 py-3 text-lg text-text transition hover:border-slate-950"
          >
            How it works
          </a>

          <a href="/planner" className="f rounded-xl bg-primary px-6 py-3 text-lg text-white transition hover:bg-slate-800">
            Start planning
          </a>
        </div>

        <div className="mt-2 flex flex-row items-center justify-center gap-2">
          <Sparkles />
          <p>No endless lists. Just a focused shortlist.</p>
        </div>
      </div>
    </section>
  );
}
