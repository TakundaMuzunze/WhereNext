# Destination-first planning

The default `/planner` collects interests, group budget in GBP, adults and timing without requiring an airport. Timing can be flexible, a preferred calendar month or exact dates. Flexible/month requests use an approximate stay of 1–28 nights; exact dates derive nights using UTC calendar days. This records the traveller's intended duration, not an ideal stay recommendation. Budgets are stored as integer pence.

Validated `kind=discovery` URLs preserve these inputs through results, edits, destination details and the existing sign-in/save continuation. Invalid links do not fall back to an unrelated request. Old dated links and old planner-answer URLs still work. `/planner?mode=legacy` retains access to the previous planner while migration of the experience continues.

## Evidence and ordering

Results select from the imported destination catalogue, independently of fares and authored guide completeness. All candidates are assessed before display pagination; a later catalogue page cannot be silently excluded from the ranking. The initial implementation reads the current catalogue and its relevant stored observations in batches. This keeps provider requests out of discovery; larger catalogue volumes will require measuring database/rendering costs before changing the selection policy.

Each requested interest has equal importance. The pure ranking policy compares supported-interest totals, then prefers fewer explicit contradictions, then destination name and ID for stable ties. Unknowns never become support or mismatch. Named-place counts, guide completeness, prices, party size, budget and intended duration do not affect that order. With no usable evidence, destinations tie on evidence and sort by name; this is not a claim of suitability. The current activity source cannot establish destination-wide contradictions, but the ranking policy handles them for future reviewed evidence.

Stored activity observations use the same cache keys, validation, category mapping and interpretation as destination details. Identity, translation version, coordinates, search scope, retrieval time and expiry must match. Stale observations may retain examples, explicitly labelled unknown. Missing evidence storage leaves the catalogue browsable with unknowns and a notice; a failed catalogue read shows a retry state with the request preserved. Opening details permits a deliberate activity check using the existing service; the live-retrieval switch remains unchanged.

Budget fit and seasonal suitability remain unknown. No flight search runs for flexible, month or exact discovery requests. Missing prices do not exclude a destination; existing guide costs, ideal durations and best-month labels are not used as discovery evidence. Existing authored guides remain available as general inspiration. Seasonal interpretation and later travel-cost checks are separate follow-up work.

## Interface and verification

Results and discovery details use a compact request summary with expandable interests and limitations. The existing dated request review also collapses its full fields by default.

Request parsing/serialization and pure ranking have focused tests. Browser journeys use disposable catalogue/cache records and the actual server-rendered results, covering all timing modes, mixed support/unknown evidence, missing fares, pagination, mobile layout, edited inputs, guide aliases and guest save context. Run `npm run test:shortlists:db -- --browser`; no live API key is required. This slice adds no schema migration and does not enable production activity retrieval.
