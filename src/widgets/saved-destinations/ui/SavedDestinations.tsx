"use client";

import { useSavedDestinations } from "@/features/saved-destinations";
import { destinations } from "@/shared/data/destinations";
import { ArrowRight, Bookmark, BookmarkCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export function SavedDestinations() {
  const { destinationIds, unsave } = useSavedDestinations();
  const savedDestinations = destinationIds.flatMap((id) => {
    const destination = destinations.find((item) => item.id === id);
    return destination ? [destination] : [];
  });

  if (savedDestinations.length === 0) {
    return (
      <section className="py-20 text-center" aria-labelledby="empty-saved-title">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary/20 text-primary">
          <Bookmark className="size-6" aria-hidden="true" />
        </span>
        <h2 id="empty-saved-title" className="mt-5 text-2xl font-semibold text-text">
          No saved destinations yet
        </h2>
        <p className="mx-auto mt-3 max-w-md text-text/70">Save a place from its destination details to keep it here.</p>
        <Link
          href="/planner"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white dark:text-[#101214]"
        >
          Explore destinations
        </Link>
      </section>
    );
  }

  return (
    <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Saved destinations" aria-live="polite">
      {savedDestinations.map((destination) => (
        <article key={destination.id} className="grid overflow-hidden rounded-3xl border border-primary/15 bg-background shadow-sm">
          <div className="relative min-h-52 overflow-hidden bg-secondary">
            <Image
              src={destination.image.src}
              alt={destination.image.alt}
              fill
              sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15" aria-hidden="true" />
            <button
              type="button"
              onClick={() => unsave(destination.id)}
              aria-label={`Remove ${destination.name} from saved destinations`}
              className="absolute top-3 right-3 grid size-11 place-items-center rounded-xl bg-black/55 text-white backdrop-blur-sm"
            >
              <BookmarkCheck className="size-5" aria-hidden="true" />
            </button>
            <span className="absolute right-4 bottom-4 left-4 text-sm text-white">
              {destination.name} · {destination.country}
            </span>
          </div>

          <div className="flex flex-col p-5">
            <h2 className="text-2xl font-semibold text-text">
              {destination.name}
              <span className="mt-1 block text-sm font-normal text-text/55">{destination.country}</span>
            </h2>
            <p className="mt-4 text-sm leading-6 text-text/70">{destination.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs tracking-wider text-text/50 uppercase">From</dt>
                <dd className="mt-1 text-sm font-medium text-text">£{destination.estimatedCostPerPerson.toLocaleString()} pp</dd>
              </div>
              <div>
                <dt className="text-xs tracking-wider text-text/50 uppercase">Ideal stay</dt>
                <dd className="mt-1 text-sm font-medium text-text">
                  {destination.recommendedDuration.min}–{destination.recommendedDuration.max} days
                </dd>
              </div>
            </dl>
            <Link href="/planner" className="mt-6 inline-flex min-h-11 items-center justify-between gap-2 text-sm font-medium text-primary">
              Plan a trip here
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}
