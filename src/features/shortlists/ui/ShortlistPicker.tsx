"use client";
import { useRef, useState } from "react";
import { destinations } from "@/shared/data/destinations";
import { ShortlistsError } from "../api/shortlists";
import { useShortlists } from "../model/ShortlistsProvider";
import { ShortlistDialog, shortlistButton, shortlistInput, validateName } from "./ShortlistDialog";

export function ShortlistPicker({ destinationId, onClose }: { destinationId: string; onClose: () => void }) {
  const { shortlists, submit, refresh, busy } = useShortlists();
  const [initial, setInitial] = useState(() => shortlists.filter((list) => list.destinationIds.includes(destinationId)).map((list) => list.id));
  const [selected, setSelected] = useState(initial);
  const [creating, setCreating] = useState(shortlists.length === 0);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lock = useRef(false);
  const destination = destinations.find((item) => item.id === destinationId);

  async function save() {
    if (lock.current) return;
    if (creating) {
      const invalid = validateName(name);
      if (invalid) {
        setError(invalid);
        return;
      }
    }
    lock.current = true;
    setError(null);
    try {
      await submit({
        destinationId,
        addTo: selected.filter((id) => !initial.includes(id)),
        removeFrom: initial.filter((id) => !selected.includes(id)),
        ...(creating ? { createName: name.trim() } : {}),
      });
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save changes. Please try again.");
      setStale(cause instanceof ShortlistsError && cause.status === 404);
    } finally {
      lock.current = false;
    }
  }

  async function refreshChoices() {
    if (lock.current) return;
    lock.current = true;
    setRefreshing(true);
    try {
      const lists = await refresh();
      const available = new Set(lists.map((list) => list.id));
      // Keep the draft delta for surviving lists; preserve unrelated changes from elsewhere.
      const additions = selected.filter((id) => !initial.includes(id) && available.has(id));
      const removals = initial.filter((id) => !selected.includes(id));
      const baseline = lists.filter((list) => list.destinationIds.includes(destinationId)).map((list) => list.id);
      setInitial(baseline);
      setSelected([...new Set([...baseline.filter((id) => !removals.includes(id)), ...additions])]);
      setStale(false);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to refresh shortlists.");
    } finally {
      lock.current = false;
      setRefreshing(false);
    }
  }

  const pending = busy || refreshing;
  return (
    <ShortlistDialog title={`Save ${destination?.name ?? "destination"} to shortlists`} onClose={onClose} busy={pending}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <p className="mb-4 text-sm text-muted">Choose where to keep this destination. Changes take effect when you save.</p>
        <fieldset disabled={pending} className="min-w-0 space-y-3">
          <legend className="sr-only">Shortlists</legend>
          {shortlists.map((list) => (
            <label key={list.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border p-3">
              <input
                type="checkbox"
                checked={selected.includes(list.id)}
                onChange={(event) => setSelected((ids) => (event.target.checked ? [...ids, list.id] : ids.filter((id) => id !== list.id)))}
                className="size-5 shrink-0 accent-primary"
              />
              <span className="min-w-0 break-words">{list.name}</span>
              <span className="ml-auto shrink-0 text-sm text-muted">{list.destinationIds.length}</span>
            </label>
          ))}
          {!shortlists.length && <p>Name your first shortlist to get started.</p>}
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={creating}
              onChange={(event) => setCreating(event.target.checked)}
              className="size-5 shrink-0 accent-primary"
            />
            Create a new shortlist
          </label>
          {creating && (
            <label className="block">
              Shortlist name
              <input
                className={shortlistInput}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="off"
                placeholder="e.g. Summer city breaks"
              />
            </label>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <button className={shortlistButton} type="submit" disabled={pending || stale}>
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button className={shortlistButton} type="button" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button className={shortlistButton} type="button" onClick={() => void refreshChoices()} disabled={pending}>
            {refreshing ? "Refreshing…" : "Refresh shortlists"}
          </button>
        </div>
      </form>
    </ShortlistDialog>
  );
}
