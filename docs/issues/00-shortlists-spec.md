# Organise saved destinations into private shortlists

Published issue: https://github.com/TakundaMuzunze/WhereNext/issues/23

## Problem Statement

Saved destinations currently form one flat collection. People cannot organise alternatives for different holidays or group places by theme.

## Solution

Provide private, named shortlists. Every save belongs to at least one shortlist, and a destination may belong to several. Offer a confirmation-based membership picker and a shortlist overview with management actions. Preserve existing saves.

## User Stories

1. As a signed-in traveller, I want to create a named shortlist, so that I can organise destinations for a holiday or theme.
2. As a traveller, I want to name my first shortlist when saving, so that I can choose where my first destination belongs.
3. As a traveller, I want to choose an existing shortlist on later saves, so that I can reuse my collections.
4. As a traveller, I want to create another shortlist while saving, so that I can organise a destination without leaving the flow.
5. As a traveller, I want to save a destination in multiple shortlists, so that I can consider it for different holidays.
6. As a traveller, I want to see each destination only once in each shortlist, so that I can avoid duplicate entries.
7. As a traveller, I want to see existing memberships in the picker, so that I can understand where a destination is saved.
8. As a traveller, I want to confirm membership changes together, so that I can control when changes take effect.
9. As a traveller, I want to cancel or close the picker without saving, so that I can discard unfinished choices.
10. As a traveller, I want to see Saved when any membership exists, so that I can recognise destinations I have kept.
11. As a traveller, I want to remove a destination from one shortlist, so that I can keep other memberships intact.
12. As a traveller, I want to remove its final membership, so that I can make a destination unsaved.
13. As a traveller, I want to see my shortlist names and destination counts, so that I can find a collection to browse.
14. As a traveller, I want to open a shortlist, so that I can browse its destinations.
15. As a traveller, I want to create an empty shortlist from the overview, so that I can prepare a collection before adding destinations.
16. As a traveller, I want to rename a shortlist, so that I can keep its purpose clear.
17. As a traveller, I want to receive feedback for blank, overlong, or duplicate names, so that I can choose a valid distinguishable name.
18. As a traveller, I want to confirm shortlist deletion with its consequences explained, so that I can avoid accidental loss of saves.
19. As a traveller, I want to retain destinations in other lists after deletion, so that I can preserve unrelated plans.
20. As a traveller, I want to retain empty shortlists, so that I can reuse them later.
21. As a returning traveller, I want to find existing saves in Saved places, so that I can lose none of my previous saves.
22. As a new traveller, I want to name my own first shortlist, so that I can avoid an unnecessary default collection.
23. As a guest, I want to sign in and return to the intended destination picker, so that I can continue the action I started.
24. As a guest, I want to cancel after signing in without saving, so that I can remain in control of my collection.
25. As a traveller, I want to keep my shortlists private, so that I can prevent other users reading or changing them.
26. As a traveller, I want to retry failed changes with my choices retained, so that I can avoid repeating my work.
27. As a traveller, I want to have failed submissions leave no partial changes, so that I can trust the result of saving.
28. As a traveller, I want to refresh choices when a shortlist has been deleted elsewhere, so that I can recover from stale data.
29. As a traveller, I want to preserve unrelated membership changes from another tab, so that I can avoid overwriting other work.
30. As a traveller, I want to have my private shortlist state cleared on account changes, so that I can avoid exposing it to another session.

## Implementation Decisions

- Use User-owned Shortlist records and ShortlistItem memberships; replace flat saves rather than retaining an independent global saved record. A destination is saved if at least one membership exists.
- Keep the existing local destination catalogue and validate IDs against it.
- Enforce one membership per destination per shortlist and case-insensitive name uniqueness per owner in the database. Names are trimmed and contain 1–80 characters. Review exact normalisation before migration work.
- Derive identity from the authenticated session and check ownership of every referenced shortlist.
- Commit explicit membership additions/removals in a transaction. Picker creation and the initial membership succeed or fail together; cancellation writes nothing.
- Reject stale shortlist references without partial writes, retain pending choices, and offer refresh. Preserve unrelated changes from other tabs; define and test deterministic behaviour for concurrent edits of the same membership without adding conflict detection in this version.
- Show an overview with names, counts, empty lists, and creation; detail views provide destinations and management. Confirm deletion and explain saves that will disappear. Empty lists remain reusable.
- Preserve existing saves in one Saved places shortlist per owner with saves; create none for users without saves. Verify preservation before retiring old storage.
- After guest sign-in, resume the intended destination picker rather than saving automatically. Clear private client state on session changes.
- Preserve implementation order: models, migration, first transactional operation, remaining backend, client integration, final verification. The first three are user-led learning checkpoints and must not be completed autonomously by an agent.
- Follow existing feature-oriented architecture, authentication, API validation, shared state, and UI patterns. No new dependency is assumed.

## Testing Decisions

- Confirmed approach: use existing browser journey tests for visible behaviour, and authenticated API boundaries against isolated Postgres test data for persistence guarantees. A narrowly scoped migration verification checks old-to-new data preservation.
- Existing saved-details browser tests stub the backend; keep that pattern for UI interaction coverage, but do not claim it proves database behaviour.
- Existing saved-destination route tests provide prior art for request validation and ownership; add real database coverage where mocks cannot prove constraints or transactions.
- Test observable responses and persisted outcomes rather than internal function calls or ORM call shapes.
- Cover cross-user reads/writes; duplicate names and memberships including races; transaction rollback; stale references; migration preservation; deletion isolation; last-membership removal; cancellation; retry; guest continuation; and session changes.
- Run type checking, relevant tests, and diff review before completion. Isolate test data from development and production data.

## Out of Scope

Sharing, collaboration, notes, manual ordering, dedicated move actions, persisted planner answers or recommendation snapshots, itineraries, dates/budgets, destination-catalogue migration, and conflict detection for simultaneous edits of the same membership.

## Further Notes

Implementation is not authorised by publishing these issues. Preserve the user-led learning checkpoints. Database model and migration mechanics will be reviewed before application. The specification and ordered delivery issues are published with the ready-for-agent label, while explicitly preserving the human checkpoints and dependencies in their bodies.
