"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSavedDestinations } from "../model/useSavedDestinations";

type SaveDestinationButtonProps = { destinationId: string };

export function SaveDestinationButton({ destinationId }: SaveDestinationButtonProps) {
  const { isSaved, save, unsave } = useSavedDestinations();
  const saved = isSaved(destinationId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => (saved ? unsave(destinationId) : save(destinationId))}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-secondary/20"
    >
      {saved ? <BookmarkCheck className="size-4" aria-hidden="true" /> : <Bookmark className="size-4" aria-hidden="true" />}
      {saved ? "Saved" : "Save destination"}
    </button>
  );
}
