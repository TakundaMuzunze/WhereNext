"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSavedDestinations } from "../model/useSavedDestinations";

type SaveDestinationButtonProps = { destinationId: string };

export function SaveDestinationButton({ destinationId }: SaveDestinationButtonProps) {
  const { isSaved, isLoading, isUpdating, save, unsave, error, retry } = useSavedDestinations();
  const saved = isSaved(destinationId);
  const pending = isUpdating(destinationId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={isLoading || pending}
      onClick={() => (error ? retry() : saved ? unsave(destinationId) : save(destinationId))}
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-secondary/20 disabled:cursor-default disabled:opacity-60"
    >
      {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
      {pending
        ? saved
          ? "Removing…"
          : "Saving…"
        : error
          ? "Retry saved destinations"
          : isLoading
            ? "Loading saves…"
            : saved
              ? "Saved"
              : "Save destination"}
    </button>
  );
}
