export function saveDestination(ids: string[], destinationId: string) {
  if (ids.includes(destinationId)) {
    return ids;
  }

  return [...ids, destinationId];
}

export function unsaveDestination(ids: string[], destinationId: string) {
  return ids.filter((id) => id !== destinationId);
}
