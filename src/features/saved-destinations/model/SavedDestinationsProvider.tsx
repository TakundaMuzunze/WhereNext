"use client";

import { useSession } from "@/shared/lib/auth/auth-client";
import { consumePendingSave, signInHref } from "@/shared/lib/auth/signInJourney";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { getSavedDestinations, removeDestination, saveDestination, SavedDestinationsError } from "../api/saveDestinations";

type SavedDestinationsState = {
  destinationIds: string[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
  isSaved: (id: string) => boolean;
  isUpdating: (id: string) => boolean;
  save: (id: string) => Promise<void>;
  unsave: (id: string) => Promise<void>;
};

const SavedContext = createContext<SavedDestinationsState | null>(null);

export function SavedDestinationsProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  return (
    <SessionSavedDestinations key={session?.session.id ?? "guest"} signedIn={Boolean(session?.user)} authPending={isPending}>
      {children}
    </SessionSavedDestinations>
  );
}

function SessionSavedDestinations({ children, signedIn, authPending }: { children: ReactNode; signedIn: boolean; authPending: boolean }) {
  const [destinationIds, setDestinationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(signedIn);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const mounted = useRef(true);
  const router = useRouter();

  function promptSignIn(destinationId?: string) {
    const returnTo = window.location.pathname + window.location.search + window.location.hash;
    router.push(signInHref(returnTo, destinationId));
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    getSavedDestinations(controller.signal)
      .then(async (ids) => {
        if (!controller.signal.aborted) {
          const intent = consumePendingSave();
          if (intent) {
            try {
              const result = await saveDestination(intent.destinationId);
              if (result !== "saved") throw new Error("Save failed");
              if (!ids.includes(intent.destinationId)) ids = [intent.destinationId, ...ids];
              if (!controller.signal.aborted) toast.success("Destination saved.");
            } catch {
              if (!controller.signal.aborted) toast.error("You’re signed in, but we couldn’t save this destination. Please try again.");
            }
          }
          if (controller.signal.aborted) return;
          setDestinationIds(ids);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        if (cause instanceof SavedDestinationsError && cause.status === 401) {
          setDestinationIds([]);
          const returnTo = window.location.pathname + window.location.search + window.location.hash;
          router.push(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
        }
        if (consumePendingSave()) toast.error("You’re signed in, but we couldn’t save this destination. Please try again.");
        setError("We couldn't load your saved destinations. Please try again.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [signedIn, attempt, router]);

  async function mutate(id: string, remove: boolean) {
    if (authPending || isLoading || pending.current.has(id)) return;
    if (!signedIn) {
      promptSignIn(remove ? undefined : id);
      return;
    }
    if (error) {
      toast.error(error);
      return;
    }
    pending.current.add(id);
    setPendingIds([...pending.current]);
    try {
      const result = await (remove ? removeDestination(id) : saveDestination(id));
      if (!mounted.current) return;
      if (result === "unauthorised") {
        setDestinationIds([]);
        promptSignIn(remove ? undefined : id);
        return;
      }
      setDestinationIds((ids) => (remove ? ids.filter((savedId) => savedId !== id) : ids.includes(id) ? ids : [id, ...ids]));
      toast.success(remove ? "Destination removed." : "Destination saved.");
    } catch {
      if (mounted.current)
        toast.error(remove ? "We couldn't remove this destination. Please try again." : "We couldn't save this destination. Please try again.");
    } finally {
      pending.current.delete(id);
      if (mounted.current) setPendingIds([...pending.current]);
    }
  }

  return (
    <SavedContext.Provider
      value={{
        destinationIds,
        isLoading: authPending || isLoading,
        error,
        retry: () => {
          if (pending.current.size) return;
          setIsLoading(true);
          setError(null);
          setAttempt((value) => value + 1);
        },
        isSaved: (id) => destinationIds.includes(id),
        isUpdating: (id) => pendingIds.includes(id),
        save: (id) => mutate(id, false),
        unsave: (id) => mutate(id, true),
      }}
    >
      {children}
    </SavedContext.Provider>
  );
}

export function useSavedDestinationsContext() {
  const state = useContext(SavedContext);
  if (!state) throw new Error("SavedDestinationsProvider is required");
  return state;
}
