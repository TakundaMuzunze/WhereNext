"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { useSavedDestinations } from "../model/useSavedDestinations";

export function SavedDestinationsLink() {
  const { destinationIds } = useSavedDestinations();

  return (
    <Link
      href="/saved"
      className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm text-text transition-colors hover:bg-secondary"
    >
      <Bookmark className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">Saved</span>
      {destinationIds.length > 0 && (
        <span
          className="grid size-5 place-items-center rounded-full bg-primary text-xs text-primary-foreground"
          aria-label={`${destinationIds.length} saved destinations`}
        >
          {destinationIds.length}
        </span>
      )}
    </Link>
  );
}
