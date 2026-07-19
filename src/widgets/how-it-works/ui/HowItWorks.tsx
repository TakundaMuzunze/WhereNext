import { Filter, MapPin, Pin, SlidersHorizontal, Sparkle, Sparkles } from "lucide-react";

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Set your trip",
    description: "Share your dates, budget, travel style, and the experiences you care about.",
  },
  {
    icon: Sparkles,
    title: "Meet your matches",
    description: "We narrow the options to destinations that genuinely fit your preferences.",
  },
  {
    icon: MapPin,
    title: "Choose where next",
    description: "Compare the strongest matches and pick the trip that feels right.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-24">
      <div className="flex flex-col justify-start gap-2">
        <span className="w-full max-w-2xs rounded-xl bg-secondary p-2 text-sm tracking-widest text-text uppercase md:px-3 md:py-1">How it works</span>
        <h2 className="text-3xl text-text">Less searching. Better choices.</h2>
        <p className="text-text/70">Three quick steps turn a vague idea into a focused destination shortlist.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => {
          const Icon = step.icon;

          return (
            <article
              key={step.title}
              className="rounded-3xl border border-primary/20 bg-background p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="rounded-2xl bg-secondary p-3 text-text">
                  <Icon aria-hidden="true" className="h-6 w-6" />
                </div>

                <span className="text-sm font-semibold text-text/50">0{index + 1}</span>
              </div>

              <h3 className="text-xl font-semibold text-text">{step.title}</h3>

              <p className="mt-3 leading-7 text-text/75">{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
