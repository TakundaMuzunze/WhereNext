"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, ArrowRight, FolderHeart, Plus } from "lucide-react";
import { useSession } from "@/shared/lib/auth/auth-client";
import { destinations } from "@/shared/data/destinations";
import { useShortlists } from "../model/ShortlistsProvider";
import { ShortlistDialog, shortlistButton, shortlistInput, validateName } from "./ShortlistDialog";

type Action = { kind: "create" } | { kind: "rename" | "delete"; id: string; name: string };

export function ShortlistBrowser({ shortlistId }: { shortlistId?: string }) {
  const state = useShortlists();
  const { data: session, isPending } = useSession();
  const [action, setAction] = useState<Action | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const list = state.shortlists.find((item) => item.id === shortlistId);

  if (isPending || state.isLoading)
    return (
      <p role="status" className="py-12">
        Loading shortlists…
      </p>
    );
  if (!session?.user)
    return (
      <section className="py-20 text-center">
        <Bookmark className="mx-auto size-10 text-primary" aria-hidden="true" />
        <h2 className="mt-5 text-2xl font-semibold">Sign in to view your shortlists</h2>
        <p className="mt-3 text-muted">Keep your travel ideas together in private shortlists.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className={shortlistButton} href={`/sign-in?returnTo=${encodeURIComponent(shortlistId ? `/saved/${shortlistId}` : "/saved")}`}>
            Sign in
          </Link>
          <Link className={shortlistButton} href="/planner">
            Explore destinations
          </Link>
        </div>
      </section>
    );
  if (state.error)
    return (
      <div role="alert" className="py-12">
        <p>{state.error}</p>
        <button className={`${shortlistButton} mt-4`} onClick={state.retry}>
          Try again
        </button>
      </div>
    );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {shortlistId ? (
          <Link href="/saved" className="text-sm text-primary">
            ← All shortlists
          </Link>
        ) : (
          <p className="text-muted">
            {state.shortlists.length} {state.shortlists.length === 1 ? "shortlist" : "shortlists"}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button className={shortlistButton} disabled={state.busy} onClick={() => setAction({ kind: "create" })}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Create shortlist
          </button>
          <button
            className={shortlistButton}
            disabled={state.busy}
            onClick={() => {
              void state
                .refresh()
                .then(() => setRefreshError(null))
                .catch(() => setRefreshError("Unable to refresh. Please try again."));
            }}
          >
            Refresh shortlists
          </button>
        </div>
      </div>
      {refreshError && <p role="alert">{refreshError}</p>}
      {shortlistId ? (
        list ? (
          <>
            <section className="mb-8 rounded-3xl border border-border bg-secondary p-6">
              <p className="text-sm text-muted">Private shortlist · {list.destinationIds.length} destinations</p>
              <h2 className="mt-2 text-3xl font-semibold wrap-break-word">{list.name}</h2>
              <div className="mt-5 flex gap-3">
                <button className={shortlistButton} disabled={state.busy} onClick={() => setAction({ kind: "rename", id: list.id, name: list.name })}>
                  Rename shortlist
                </button>
                <button className={shortlistButton} disabled={state.busy} onClick={() => setAction({ kind: "delete", id: list.id, name: list.name })}>
                  Delete shortlist
                </button>
              </div>
            </section>
            {!list.destinationIds.length ? (
              <section className="py-16 text-center">
                <h2 className="text-2xl font-semibold">This shortlist is ready for your ideas</h2>
                <p className="mt-3 text-muted">Save a destination and choose this shortlist to add it here.</p>
                <Link className={`${shortlistButton} mt-6`} href="/planner">
                  Explore destinations
                </Link>
              </section>
            ) : (
              <section aria-label="Shortlist destinations" className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {list.destinationIds.flatMap((id) => {
                  const destination = destinations.find((item) => item.id === id);
                  if (!destination) return [];
                  return [
                    <article key={id} className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
                      <div className="relative h-48 bg-secondary">
                        <Image
                          src={destination.image.src}
                          alt={destination.image.alt}
                          fill
                          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
                          className="object-cover"
                        />
                      </div>
                      <div className="p-5">
                        <p className="text-sm text-muted">{destination.country}</p>
                        <h3 className="mt-1 text-2xl font-semibold">{destination.name}</h3>
                        <p className="mt-3 text-sm leading-6 text-muted">{destination.description}</p>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <Link className={shortlistButton} href={`/destinations/${id}`}>
                            View destination <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                          </Link>
                          <button className={shortlistButton} disabled={state.busy} onClick={() => state.openPicker(id)} aria-haspopup="dialog">
                            Edit shortlists
                          </button>
                          <RemoveMembership shortlistId={list.id} destinationId={id} name={destination.name} />
                        </div>
                      </div>
                    </article>,
                  ];
                })}
              </section>
            )}
          </>
        ) : (
          <section className="py-12">
            <h2 className="text-2xl font-semibold">Shortlist not found</h2>
            <p className="mt-3">It may have been deleted or belong to another account.</p>
          </section>
        )
      ) : state.shortlists.length ? (
        <section aria-label="Your shortlists" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {state.shortlists.map((item) => (
            <article key={item.id} className="rounded-3xl border border-border bg-secondary p-6">
              <FolderHeart className="size-8 text-primary" aria-hidden="true" />
              <h2 className="mt-5 text-2xl font-semibold wrap-break-word">
                <Link href={`/saved/${encodeURIComponent(item.id)}`} className="hover:underline">
                  {item.name}
                </Link>
              </h2>
              <p className="mt-2 text-muted">
                {item.destinationIds.length} {item.destinationIds.length === 1 ? "destination" : "destinations"}
              </p>
              <p className="mt-4 text-xs tracking-wider text-text/50 uppercase">Private shortlist</p>
            </article>
          ))}
        </section>
      ) : (
        <section className="py-16 text-center">
          <FolderHeart className="mx-auto size-12 text-primary" aria-hidden="true" />
          <h2 className="mt-5 text-2xl font-semibold">No shortlists yet</h2>
          <p className="mt-3 text-muted">Create a shortlist for your next trip, or save a destination to get started.</p>
        </section>
      )}
      {action && <ManageShortlist key={`${action.kind}-${"id" in action ? action.id : "new"}`} action={action} onClose={() => setAction(null)} />}
    </>
  );
}

function RemoveMembership({ shortlistId, destinationId, name }: { shortlistId: string; destinationId: string; name: string }) {
  const { submit, busy } = useShortlists();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        className={shortlistButton}
        disabled={busy}
        onClick={() => {
          setError(null);
          void submit({ destinationId, addTo: [], removeFrom: [shortlistId] }).catch((cause: unknown) =>
            setError(cause instanceof Error ? cause.message : "Unable to remove destination."),
          );
        }}
        aria-label={`Remove ${name} from this shortlist`}
      >
        Remove from shortlist
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

function ManageShortlist({ action, onClose }: { action: Action; onClose: () => void }) {
  const { create, rename, remove, busy, shortlists } = useShortlists();
  const [name, setName] = useState(action.kind === "create" ? "" : action.name);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const title = action.kind === "create" ? "Create shortlist" : action.kind === "rename" ? "Rename shortlist" : "Delete shortlist";
  const deleting = action.kind === "delete" ? shortlists.find((list) => list.id === action.id) : undefined;
  const exclusiveCount =
    deleting?.destinationIds.filter((id) => !shortlists.some((other) => other.id !== deleting.id && other.destinationIds.includes(id))).length ?? 0;
  async function confirm() {
    if (lock.current) return;
    if (action.kind !== "delete") {
      const invalid = validateName(name);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    lock.current = true;
    setError(null);
    try {
      if (action.kind === "create") await create(name.trim());
      else if (action.kind === "rename") await rename(action.id, name.trim());
      else await remove(action.id);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update shortlist.");
    } finally {
      lock.current = false;
    }
  }
  return (
    <ShortlistDialog title={title} onClose={onClose} busy={busy}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void confirm();
        }}
      >
        {action.kind === "delete" ? (
          <>
            <p className="wrap-break-word">Delete “{action.name}”?</p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Currently, {exclusiveCount} {exclusiveCount === 1 ? "destination is" : "destinations are"} saved only here and will become unsaved.
              Destinations in other shortlists stay saved. This cannot be undone.
            </p>
          </>
        ) : (
          <label>
            Shortlist name
            <input
              className={shortlistInput}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={busy}
              autoComplete="off"
              placeholder="e.g. Summer city breaks"
            />
          </label>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <button className={shortlistButton} type="submit" disabled={busy}>
            {busy ? "Saving…" : action.kind === "delete" ? "Delete shortlist" : action.kind === "create" ? "Create shortlist" : "Save name"}
          </button>
          <button className={shortlistButton} type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ShortlistDialog>
  );
}
