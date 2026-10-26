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

## Verified destination identities

Both this endpoint and `POST /api/shortlists` accept an existing guide ID or a Wikidata ID with a verified guide link, such as `wikidata:Q597` for Lisbon. Both store the original `lisbon-portugal` identity, so aliases share memberships and cannot create duplicate saves. Unknown destinations return 404. An unlinked Wikidata identity is accepted when its imported catalogue record exists.

For an alias request, the membership response echoes the requested `destinationId` and adds `canonicalDestinationId` with the stored guide ID. The shared client uses that canonical ID for local membership state and newly created shortlists. Responses to original guide IDs keep their existing shape.

Destination detail URLs accept the same verified aliases and retain planner navigation. The guide and Save button use the original guide ID. Apply the destination-guide identity migration before serving alias requests.

## Imported places

Imported places without an authored guide use their durable catalogue ID (for example, `wikidata:Q159457`). The server checks the catalogue before accepting additions or creating a shortlist. It does not require dates, fares, recent enrichment or a complete guide. Details show recorded geography, import date and source attribution; unsupported activity, seasonal and budget assessments remain unknown.

Shortlist reads include an optional `destination: { id, name, country }` on imported membership items. Successful membership writes include the same summary, allowing saved cards to appear immediately. The client validates that each summary belongs to its membership ID. Original guides keep their existing presentation and saved IDs.

Catalogue refreshes update existing records atomically and do not delete absent records. A failed refresh therefore leaves saved identities and earlier place information available. If a record is unavailable, its saved reference is still shown and its owner can remove it. Removal-only requests cannot create a list or add an unknown destination.

Guest continuation accepts imported IDs and resumes the confirmation picker once; returning from sign-in never writes a membership automatically.

Run `npm run test:shortlists:db -- --browser` for database integration tests, an isolated Webpack production build and imported-place browser journeys. The runner seeds a disposable local database and removes it afterwards; it does not use the hosted catalogue.

## Concurrent requests

Transactions use Serializable isolation: successful operations behave as though they ran one at a time in a database-selected order. Simultaneous opposing changes have no guaranteed arrival-order winner; the later operation in that serial order determines the membership. Repeated additions cannot create duplicate memberships, and unrelated changes are preserved.

PostgreSQL can reject an overlapping transaction to maintain that guarantee. Prisma reports this as P2034; the endpoint retries the entire transaction, including ownership checks, up to three total attempts. If all attempts conflict, it returns 409 and applies none of that request's changes. Unexpected database failures propagate rather than being presented as successful saves.

This endpoint changes existing-list memberships. Creating a shortlist with its first destination remains the atomic POST operation at `/api/shortlists`.

## Picker confirmation

The same PATCH endpoint accepts an optional `createName` (trimmed, 1–80 characters). It creates one new shortlist with this destination inside the same transaction as `addTo` and `removeFrom`. A duplicate name returns 409; stale references or any other failure roll back the new list as well as the membership changes. The response additionally includes `createdShortlist: { id, shortlistName }` when creation succeeds, so clients can identify it without guessing from membership IDs.

The frontend keeps the name and checkbox selections in a local draft until **Save changes**. Cancel, Escape, close, and clicking the backdrop discard that draft without requests. Failed submissions retain it. After a stale-reference error, refresh discards references to deleted lists, preserves pending changes for surviving lists, and adopts unrelated membership changes from the latest response.

`GET /api/shortlists` now includes each owned list's destination IDs alongside its count. The shared client provider uses that snapshot for browsing, counts, membership checkboxes and Saved indicators. It resets on session changes. Returning from guest sign-in consumes the existing continuation token to open the picker, without writing a save.
