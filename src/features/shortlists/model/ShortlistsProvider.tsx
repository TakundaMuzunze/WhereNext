"use client";

import { useSession } from "@/shared/lib/auth/auth-client";
import { consumePendingSave, signInHref } from "@/shared/lib/auth/signInJourney";
import { destinations } from "@/shared/data/destinations";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  changeMemberships,
  createShortlist,
  getShortlists,
  removeShortlist,
  renameShortlist,
  ShortlistsError,
  type MembershipChange,
  type Shortlist,
} from "../api/shortlists";
import { ShortlistPicker } from "../ui/ShortlistPicker";

type State = {
  shortlists: Shortlist[];
  destinationIds: string[];
  isLoading: boolean;
  error: string | null;
  busy: boolean;
  retry: () => void;
  refresh: () => Promise<Shortlist[]>;
  isSaved: (id: string) => boolean;
  openPicker: (id: string) => void;
  create: (name: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  submit: (change: MembershipChange) => Promise<void>;
};
const Context = createContext<State | null>(null);

export function ShortlistsProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  return (
    <SessionShortlists key={session?.session.id ?? "guest"} signedIn={Boolean(session?.user)} authPending={isPending}>
      {children}
    </SessionShortlists>
  );
}

function SessionShortlists({ children, signedIn, authPending }: { children: ReactNode; signedIn: boolean; authPending: boolean }) {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [isLoading, setIsLoading] = useState(signedIn);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picker, setPicker] = useState<string | null>(null);
  const mounted = useRef(false);
  const pending = useRef(false);
  const revision = useRef(0);
  const router = useRouter();
  const invalidateRequests = useCallback(() => {
    revision.current++;
  }, []);

  const promptSignIn = useCallback(
    (destinationId?: string) => {
      router.push(signInHref(window.location.pathname + window.location.search + window.location.hash, destinationId));
    },
    [router],
  );

  const handleError = useCallback(
    (cause: unknown) => {
      if (cause instanceof ShortlistsError && cause.status === 401 && mounted.current) {
        setShortlists([]);
        setPicker(null);
        setError(cause.message);
        promptSignIn();
      }
    },
    [promptSignIn],
  );

  const refresh = useCallback(async () => {
    const requestRevision = ++revision.current;
    try {
      const lists = await getShortlists();
      if (mounted.current && requestRevision === revision.current) {
        setShortlists(lists);
        setError(null);
      }
      return lists;
    } catch (cause) {
      if (mounted.current && requestRevision === revision.current) {
        handleError(cause);
        setError("We couldn't load your shortlists. Please try again.");
      }
      throw cause;
    } finally {
      if (mounted.current && requestRevision === revision.current) setIsLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    let active = true;
    mounted.current = true;
    if (signedIn) {
      void refresh()
        .then(() => {
          if (!active || !mounted.current) return;
          const intent = consumePendingSave();
          if (intent && destinations.some((destination) => destination.id === intent.destinationId)) setPicker(intent.destinationId);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
      mounted.current = false;
      invalidateRequests();
    };
  }, [signedIn, refresh, invalidateRequests]);

  async function mutate(action: () => Promise<void>) {
    if (pending.current) throw new Error("Please wait for your current change to finish.");
    pending.current = true;
    revision.current++;
    setBusy(true);
    try {
      await action();
    } catch (cause) {
      handleError(cause);
      throw cause;
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  const destinationIds = [...new Set(shortlists.flatMap((list) => list.destinationIds))];
  const value: State = {
    shortlists,
    destinationIds,
    isLoading: authPending || isLoading,
    error,
    busy,
    refresh,
    retry: () => {
      setIsLoading(true);
      void refresh()
        .then(() => {
          if (!mounted.current) return;
          const intent = consumePendingSave();
          if (intent && destinations.some((d) => d.id === intent.destinationId)) setPicker(intent.destinationId);
        })
        .catch(() => {});
    },
    isSaved: (id) => destinationIds.includes(id),
    openPicker: (id) => {
      if (authPending || isLoading || pending.current) return;
      if (!signedIn) {
        promptSignIn(id);
        return;
      }
      setPicker(id);
    },
    create: (name) =>
      mutate(async () => {
        const list = await createShortlist(name);
        if (mounted.current) setShortlists((lists) => [...lists, list]);
      }),
    rename: (id, name) =>
      mutate(async () => {
        await renameShortlist(id, name);
        if (mounted.current) setShortlists((lists) => lists.map((list) => (list.id === id ? { ...list, name: name.trim() } : list)));
      }),
    remove: (id) =>
      mutate(async () => {
        await removeShortlist(id);
        if (mounted.current) setShortlists((lists) => lists.filter((list) => list.id !== id));
      }),
    submit: (change) =>
      mutate(async () => {
        const result = await changeMemberships(change);
        if (!mounted.current) return;
        setShortlists((lists) => {
          const updated = lists.map((list) => ({
            ...list,
            destinationIds: result.shortlistIds.includes(list.id)
              ? [...new Set([...list.destinationIds, result.destinationId])]
              : list.destinationIds.filter((id) => id !== result.destinationId),
          }));
          if (result.createdShortlist && !updated.some((list) => list.id === result.createdShortlist?.id)) updated.push(result.createdShortlist);
          return updated;
        });
        setError(null);
        // A concurrent tab may have created another list absent from this snapshot.
        if (result.shortlistIds.some((id) => id !== result.createdShortlist?.id && !shortlists.some((list) => list.id === id))) {
          try {
            await refresh();
          } catch {
            /* The write succeeded; the overview offers a read retry. */
          }
        }
      }),
  };

  return (
    <Context.Provider value={value}>
      {children}
      {picker && <ShortlistPicker key={picker} destinationId={picker} onClose={() => setPicker(null)} />}
    </Context.Provider>
  );
}

export function useShortlists() {
  const state = useContext(Context);
  if (!state) throw new Error("ShortlistsProvider is required");
  return state;
}
