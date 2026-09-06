import type { DestinationRecommendation } from "@/entities/destination";
import type { PlannerAnswers } from "@/entities/trip/model/types";
import { ArrowLeft, CalendarDays, CircleCheck, Footprints, Pencil, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type DestinationDetailsProps = {
  recommendation: DestinationRecommendation;
  answers: PlannerAnswers;
  matchLabel: string;
  backHref: string;
  editHref: string;
};

const costLevelLabels = {
  budget: "Budget-friendly",
  "mid-range": "Mid-range",
  premium: "Premium",
} as const;

function formatMonths(months: string[]) {
  return months.map((month) => month.slice(0, 3)).join(" · ");
}

export function DestinationDetails({ recommendation, answers, matchLabel, backHref, editHref }: DestinationDetailsProps) {
  const { destination, reasons, score } = recommendation;
  const travellerCount = Number(answers.travellers);
  const estimatedTotal = destination.estimatedCostPerPerson * travellerCount;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 pt-28 pb-20">
      <Link href={backHref} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to your matches
      </Link>

      <section className="grid gap-8 md:grid-cols-[1.15fr_0.85fr]" aria-labelledby="destination-title">
        <div className="flex min-h-80 flex-col justify-center rounded-3xl border border-primary/20 bg-background p-8 shadow-sm sm:p-10">
          <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">{matchLabel}</p>
          <h1 id="destination-title" className="mt-4 text-5xl font-semibold tracking-[-0.055em] text-text sm:text-6xl">
            {destination.name}
            <span className="block font-normal text-text/50">{destination.country}</span>
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-text/70">{destination.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white dark:text-[#101214]">{score}% match</span>
            <span className="text-sm font-medium text-accent">Built around your trip answers</span>
          </div>
        </div>

        <div className="relative min-h-72 overflow-hidden rounded-3xl bg-secondary md:min-h-80">
          <Image
            src={destination.image.src}
            alt={destination.image.alt}
            fill
            priority
            sizes="(max-width: 767px) 100vw, 40vw"
            className="object-cover transition-transform duration-500 hover:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" aria-hidden="true" />
          <div className="absolute right-5 bottom-5 left-5 z-10 flex justify-between gap-3 text-xs text-white">
            <span>
              {destination.name}, {destination.country}
            </span>
            <span>{answers.tripType.replaceAll("-", " ")}</span>
          </div>
        </div>
      </section>

      <section
        className="my-6 grid overflow-hidden rounded-2xl border border-primary/15 bg-primary/15 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Destination essentials"
      >
        <Fact label="Estimated cost" value={`£${destination.estimatedCostPerPerson.toLocaleString()} per person`} />
        <Fact label="Ideal duration" value={`${destination.recommendedDuration.min}-${destination.recommendedDuration.max} days`} />
        <Fact label="Best months" value={formatMonths(destination.bestMonths)} />
        <Fact label="Cost level" value={costLevelLabels[destination.costLevel]} />
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-text">Why {destination.name} fits your trip</h2>
            <ul className="mt-5 grid gap-3">
              {reasons.map((reason) => (
                <li key={reason} className="flex items-start gap-3 leading-6 text-text/75">
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  {reason}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-text">Things you’ll enjoy</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {destination.activities.map((activity) => (
                <span key={activity} className="rounded-full bg-secondary/20 px-3 py-2 text-sm text-text/75">
                  {activity}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold tracking-tight text-text">What makes it worth the trip</h2>
            <p className="mt-4 max-w-2xl leading-7 text-text/70">
              {destination.description} With {answers.duration} days to explore, you can settle into the destination without needing to rush every
              experience.
            </p>
          </section>
        </div>

        <aside className="self-start rounded-3xl bg-secondary/20 p-7" aria-label="Useful travel notes">
          <h2 className="text-2xl font-semibold tracking-tight text-text">Good to know</h2>
          <ul className="mt-6 grid gap-5">
            <TravelTip
              icon={<Footprints className="size-4" aria-hidden="true" />}
              text={`The ideal stay is ${destination.recommendedDuration.min}-${destination.recommendedDuration.max} days, so your ${answers.duration}-day plan is easy to compare.`}
            />
            <TravelTip
              icon={<CalendarDays className="size-4" aria-hidden="true" />}
              text={`${answers.travelMonth} is ${destination.bestMonths.includes(answers.travelMonth) ? "one of the recommended months to visit" : "outside the usual best-month window, so check seasonal conditions"}.`}
            />
            <TravelTip
              icon={<WalletCards className="size-4" aria-hidden="true" />}
              text={`Allow around £${estimatedTotal.toLocaleString()} for ${travellerCount} ${travellerCount === 1 ? "traveller" : "travellers"}, before any extra flexibility.`}
            />
          </ul>
        </aside>
      </div>

      <div className="mt-12 flex flex-wrap gap-3 border-t border-primary/15 pt-7">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white dark:text-[#101214]"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to matches
        </Link>
        <Link
          href={editHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-text"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Edit trip answers
        </Link>
      </div>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-primary/15 bg-background p-5 not-last:border-b sm:odd:border-r sm:nth-[n+3]:border-b-0 lg:border-r lg:border-b-0 lg:last:border-r-0">
      <span className="block text-xs tracking-wider text-text/50 uppercase">{label}</span>
      <span className="mt-2 block text-sm font-medium text-text">{value}</span>
    </div>
  );
}

function TravelTip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] items-start gap-3 text-sm leading-6 text-text/75">
      <span className="grid size-9 place-items-center rounded-xl bg-background text-primary">{icon}</span>
      <span>{text}</span>
    </li>
  );
}
