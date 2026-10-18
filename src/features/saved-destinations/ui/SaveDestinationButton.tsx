"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSavedDestinations } from "../model/useSavedDestinations";

type SaveDestinationButtonProps = { destinationId: string };

export function SaveDestinationButton({ destinationId }: SaveDestinationButtonProps) {
  const { isSaved, isLoading, openPicker, error, retry } = useSavedDestinations();
  const saved = isSaved(destinationId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-haspopup="dialog"
      disabled={isLoading}
      onClick={() => (error ? retry() : openPicker(destinationId))}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-secondary disabled:cursor-default disabled:opacity-60"
    >
      {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
      {error ? "Retry shortlists" : isLoading ? "Loading saves…" : saved ? "Saved" : "Save destination"}
    </button>
  );
}
