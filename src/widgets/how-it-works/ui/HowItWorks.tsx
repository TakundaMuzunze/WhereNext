import { Check, MapPin, SlidersHorizontal, Sparkles } from "lucide-react";
import Link from "next/link";

const steps = [
  {
    icon: SlidersHorizontal,
    title: "Set your trip",
    description: "Share your dates, budget, travel style, and the experiences you care about.",
    detail: "A guided planner keeps the questions focused and only asks for information that affects your matches.",
  },
  {
    icon: Sparkles,
    title: "Meet your matches",
    description: "We narrow the options to destinations that genuinely fit your preferences.",
    detail: "Every destination receives a transparent match score, so you can see why it earned its place.",
  },
  {
    icon: MapPin,
    title: "Choose where next",
    description: "Compare the strongest matches and pick the trip that feels right.",
    detail: "Explore practical destination details, estimated costs, sample itineraries, and useful travel advice.",
  },
];

const benefits = ["A shortlist tailored to your answers", "Clear reasons behind every recommendation", "Practical details to help you decide"];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="scroll-mt-20 px-6 py-20 sm:py-24 lg:py-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div className="flex flex-col items-start gap-4">
            <span className="w-fit rounded-xl bg-secondary px-3 py-2 text-sm tracking-widest text-text uppercase">How it works</span>
            <h2 id="how-it-works-heading" className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">
              Less searching. Better choices.
            </h2>
          </div>

          <p className="max-w-2xl text-lg leading-8 text-text/70 lg:justify-self-end">
            WhereNext turns a vague idea into a focused destination shortlist, while keeping you in control of the final decision.
          </p>
        </div>

        <ol className="grid list-none gap-6 p-0 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;

            return (
              <li key={step.title} className="h-full">
                <article className="flex h-full flex-col rounded-3xl border border-primary/20 bg-background p-6 shadow-sm transition hover:shadow-md motion-safe:hover:-translate-y-1 sm:p-7">
                  <div className="mb-7 flex items-center justify-between">
                    <div className="rounded-2xl bg-secondary p-3 text-text">
                      <Icon aria-hidden="true" className="h-6 w-6" />
                    </div>

                    <span aria-hidden="true" className="text-sm font-semibold text-text/50">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-text">{step.title}</h3>
                  <p className="mt-3 leading-7 text-text/80">{step.description}</p>
                  <p className="mt-5 border-t border-primary/15 pt-5 text-sm leading-6 text-text/60">{step.detail}</p>
                </article>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-8 rounded-3xl bg-primary p-7 text-white sm:p-9 lg:grid-cols-[1fr_auto] lg:items-center dark:text-[#101214]">
          <div>
            <p className="text-sm font-semibold tracking-widest uppercase opacity-75">What you’ll get</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">A recommendation you can understand—not just a score.</h3>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-2 text-sm leading-6">
                  <Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            href="/planner"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-background px-6 py-3 font-medium text-text transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-background"
          >
            Build my shortlist
          </Link>
        </div>
      </div>
    </section>
  );
}
