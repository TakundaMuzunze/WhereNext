# Shortlists

Product, architecture, implementation order, and testing approach confirmed. Published as GitHub issue #23 with ordered sub-issues #24–#29. The frontend integration in #28 uses the shortlist API and shared membership state; final migration and journey verification remain tracked in #29.

## Purpose

Help people organise destinations they are considering visiting. Backend and database learning will shape the implementation process.

## Agreed behaviour

- Each shortlist is private and owned by one signed-in user.
- Every saved destination belongs to at least one shortlist.
- A destination can belong to multiple shortlists, once per shortlist.
- The first save requires creating and naming a shortlist. Later saves allow choosing an existing shortlist or creating another.
- The Save button opens a picker showing the destination's memberships. It shows Saved when at least one membership exists.
- Existing saves move into a shortlist named Saved places for each person with existing saves. New users do not receive an automatic shortlist.
- Users can create, view, rename, and delete shortlists, and add or remove destinations.
- Removing the final destination leaves an empty shortlist available to reuse.
- Deleting a shortlist requires confirmation explaining that destinations saved only there will become unsaved. Other shortlist memberships remain intact.
- Names contain 1–80 characters after trimming surrounding spaces and are unique per owner regardless of capitalisation.
- Sharing, collaboration, reordering, notes, and a dedicated move action are outside this version.
- Guests sign in, return to their intended destination, and automatically see its shortlist picker. Saving requires choosing or creating a shortlist; cancelling leaves the destination unsaved.
- The Saved page shows a shortlist overview with names, destination counts, empty lists, and a Create shortlist action. Opening a shortlist shows its destinations and management actions.
- Picker changes are pending until Save changes is confirmed. Closing or cancelling discards them.
- Creating a shortlist through the picker creates the shortlist and its destination membership together on confirmation. Failure must not leave an accidental empty shortlist.

## Database and backend approach

- Add a Shortlist owned by a User and a ShortlistItem connecting a shortlist to a destination ID.
- Replace the flat saved-destination model with shortlist memberships. A destination is saved whenever it belongs to at least one shortlist; no separate global save record is maintained.
- Keep the existing destination catalogue in local data for this feature. Validate destination IDs against it.
- Enforce uniqueness of destination membership per shortlist and case-insensitive shortlist names per owner in the database. Review the exact name-normalisation rule before writing the migration.
- Take user identity from the authenticated session and check ownership of every referenced shortlist on the server.
- Commit each picker submission in a transaction. Creating a shortlist through the picker and adding its first destination must succeed or fail together.
- Submit explicit membership additions and removals rather than replacing all memberships, preserving unrelated changes made in another tab.
- If a referenced shortlist was deleted while the picker was open, reject the whole submission, retain pending choices, and offer a refresh of available shortlists.
- Defer conflict detection for simultaneous edits to the same membership. Define and test deterministic behaviour during backend implementation.
- Preserve existing saves by creating Saved places for each owner with saves and migrating their memberships before removing the old storage.

## Implementation sequence and learning checkpoints

1. Review proposed model fields, relationships, constraints, name normalisation, and deletion behaviour. The user writes the Prisma models; review them before applying a migration.
2. Work through the data migration together. Verify that every existing save survives and users without saves receive no automatic shortlist.
3. The user implements an authenticated operation that creates a shortlist and its first membership in a transaction. Review validation, ownership checks, and failure handling.
4. Build remaining shortlist and membership operations using the existing API and authentication patterns, without introducing dependencies unless separately justified.
5. Adapt shared saved state, implement the picker and shortlist browsing/management, and change the pending sign-in save into a pending picker intent.
6. Run type checking and relevant tests, review the diff, and verify the complete flows before considering the feature complete.

## Verification priorities

- Cross-user access cannot read or change another person's shortlists.
- Case-insensitive duplicate names and duplicate memberships are prevented, including concurrent requests.
- Invalid destinations or stale shortlist references leave no partial changes.
- Existing saves survive migration with the same owners and destinations.
- Removing or deleting one membership preserves other memberships; removing the last makes a destination unsaved.
- Empty shortlists remain visible and reusable.
- Picker cancellation writes nothing; failed submissions preserve choices for retry.
- Guest sign-in resumes the picker without automatically saving.
- Session changes clear the previous user's shortlist state.

## Scope boundary

This feature organises destination bookmarks. It does not persist planner answers, recommendation snapshots, dates, budgets, or itineraries. Dedicated collaboration, sharing, and destination-catalogue persistence remain outside this work.

## Published specification

[Feature specification and six ordered sub-issues](https://github.com/TakundaMuzunze/WhereNext/issues/23). The first three sub-issues are user-led learning checkpoints.
