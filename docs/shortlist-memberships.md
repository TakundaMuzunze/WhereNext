# Changing shortlist memberships

`PATCH /api/shortlists/memberships` updates one destination's memberships in existing shortlists. Authentication supplies the owner; a client-supplied user ID is never used.

```json
{
  "destinationId": "lisbon-portugal",
  "addTo": ["shortlist-a"],
  "removeFrom": ["shortlist-b"]
}
```

Both arrays are required and may be empty. IDs must be nonblank strings. Repeated IDs within an array are deduplicated; an ID appearing in both arrays is rejected with 400. Unknown destinations return 404.

Every referenced shortlist must exist and belong to the session user, including when adding an existing membership or removing an absent one. An unavailable reference returns 404 without applying any changes. The client should keep its pending choices and offer to refresh available shortlists.

The transaction checks ownership, inserts additions, deletes removals, and reads the destination's remaining memberships. Inserting an existing membership and removing an absent membership succeed without an error. Unmentioned shortlists and other destinations are untouched. Removing the final membership leaves the shortlist itself available and makes the destination unsaved.

```json
{
  "destinationId": "lisbon-portugal",
  "shortlistIds": ["shortlist-a"],
  "isSaved": true
}
```

The response reflects this transaction's result for the session owner. Another request can subsequently change it.

## Concurrent requests

Transactions use Serializable isolation: successful operations behave as though they ran one at a time in a database-selected order. Simultaneous opposing changes have no guaranteed arrival-order winner; the later operation in that serial order determines the membership. Repeated additions cannot create duplicate memberships, and unrelated changes are preserved.

PostgreSQL can reject an overlapping transaction to maintain that guarantee. Prisma reports this as P2034; the endpoint retries the entire transaction, including ownership checks, up to three total attempts. If all attempts conflict, it returns 409 and applies none of that request's changes. Unexpected database failures propagate rather than being presented as successful saves.

This endpoint changes existing-list memberships. Creating a shortlist with its first destination remains the atomic POST operation at `/api/shortlists`.
