"use client";

import { useSyncExternalStore } from "react";
import { saveDestination, unsaveDestination } from "./savedDestinations";

const STORAGE_KEY = "saved-destination-ids";
const STORAGE_EVENT = "saved-destinations-change";
const emptyDestinationIds: string[] = [];

let cachedValue: string | null | undefined;
let cachedDestinationIds: string[] = emptyDestinationIds;

function parseDestinationIds(value: string | null): string[] {
  if (!value) return emptyDestinationIds;

  try {
    const parsedValue: unknown = JSON.parse(value);
    return Array.isArray(parsedValue) && parsedValue.every((item) => typeof item === "string") ? parsedValue : emptyDestinationIds;
  } catch {
    return emptyDestinationIds;
  }
}

function getSnapshot() {
  const storedValue = localStorage.getItem(STORAGE_KEY);

  if (storedValue !== cachedValue) {
    cachedValue = storedValue;
    cachedDestinationIds = parseDestinationIds(storedValue);
  }

  return cachedDestinationIds;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_EVENT, onStoreChange);
  };
}

function persist(destinationIds: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(destinationIds));
  cachedValue = undefined;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function useSavedDestinations() {
  const destinationIds = useSyncExternalStore(subscribe, getSnapshot, () => emptyDestinationIds);

  return {
    destinationIds,
    save: (destinationId: string) => persist(saveDestination(destinationIds, destinationId)),
    unsave: (destinationId: string) => persist(unsaveDestination(destinationIds, destinationId)),
    isSaved: (destinationId: string) => destinationIds.includes(destinationId),
  };
}
