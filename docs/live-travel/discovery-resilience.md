# Discovery resilience and activity capacity

Reviewed on 9 November 2026 for #43. GitHub owns issue progress. This records operational evidence, recovery boundaries and the budget for the next activity-enrichment feature.

## Public entry points

`POST /api/discovery` is retired with HTTP 410 and no request parsing, database access or provider retrieval. The old flight-led search panel is removed. Dated review retains the original airport and spending allowance; its discovery link carries dates, nights, adults, budget and interests into destination-first results. This does not check prices or claim that discovery assesses departure airports or spending allowances. The underlying experimental fare adapters remain separate for future chosen-destination pricing.

The only public activity retrieval entry is `POST /api/destinations/[id]/activities`. Catalogue results and saving read stored data rather than starting activity queries. No Next.js rewrites or Server Actions expose another activity retrieval entry.

The Netlify policy now targets POST paths ending in `/activities` (`/*/activities`), including repeated slashes before the final segment. This also counts nonexistent paths with that suffix. Authentication and shortlist paths do not match. The threshold remains 10 requests per minute per IP/domain; shared provider ceilings remain authoritative for upstream use.

A bounded production check with invalid JSON objects spent no provider credits. Canonical, raw/encoded destination IDs, a trailing slash and an encoded `activities` segment returned 429 after enforcement activated; GET returned 405. The old narrow rule allowed `/api//destinations/.../activities` through to validation with HTTP 400 while the canonical route was throttled. Native URLPattern checks cover that form and repeated leading slashes with the wider rule. After deployment, verify the generated rule and repeat the hosted alias check; local pattern checks are not proof of hosted enforcement. No claim is made about distributed abuse resistance.

## Mobile recovery audit

The existing disposable-database browser journeys cover discovery results, imported/legacy details and private shortlists. The audit added a dated-to-discovery continuation and a delayed activity check during which the traveller successfully saves, then receives supported museum evidence alongside an unsupported interest. Existing journeys exercise failed retries, retained retrieval times, 429 recovery, expired examples, missing climate, broken/loading photos, failed shortlist writes, retained picker choices and guest continuation. Screens at 375–390 px preserve actions and avoid horizontal overflow.

| Data       | Timestamp and coverage meaning                                                                                                                                                                                              | Recovery                                                                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogue  | Import time records metadata retrieval, not current prices, suitability or a complete country inventory. Revision/contributor links retain provenance.                                                                      | Partial/failed refreshes retain stored places; checkpoints resume bounded work.                                                          |
| Activities | Retrieval time belongs to a 4 km, at-most-20-result category sample. Reuse lasts at most seven days; this does not verify travel-date access or opening. Capped/malformed samples and unsupported interests remain unknown. | Previous valid observations survive failed refreshes. Expired examples are labelled context, not current support. Saving is independent. |
| Images     | Stored selection time is not the photo capture date or proof of current conditions. Image availability has no activity or climate meaning. Attribution stays on destination details.                                        | Loading and broken/missing image states preserve navigation and saving. Failed enrichment retains previous valid selections.             |
| Climate    | Retrieval date is distinct from the fixed 1991–2020 historical baseline and annual reuse review. Regional means are not forecasts or confirmed activity availability.                                                       | Missing, invalid or expired observations produce explicit unknowns; the unverified view remains accessible.                              |

## Hosted reservation cleanup

The maintenance connection is configured and successful scheduled runs are visible on 7, 8 and 9 November. The [9 November run](https://github.com/TakundaMuzunze/WhereNext/actions/runs/42612238458) applied cleanup successfully for Geoapify, GeoNames, Travelpayouts and dormant SerpApi, with zero eligible records and no remaining backlog. A production read confirmed zero reservations. This verifies hosted execution, not a production deletion exercise; disposable tests verify deletion, active-window retention, rollback and unchanged allowances.

Failure annotations and bounded backlog summaries remain enabled. Individual batch failures roll back; earlier successful batches remain committed. Cleanup never refunds usage. It is not necessary to create obsolete production rows merely to demonstrate deletion.

## Bounded free-capacity budget

The user confirmed the Geoapify key/project is used only by WhereNext. [Published free-plan limits](https://www.geoapify.com/pricing/) are 3,000 credits/day and 5 requests/second. The [Places API](https://apidocs.geoapify.com/docs/places/#pricing) charges one credit per 20 returned places. Our queries cap results at 20 and use no paid fallback.

Production currently retains conservative operator ceilings of 2,500 requests/day, 200 per rolling hour and four reservations in the previous second across app instances. The 500-credit difference from the advertised daily quota leaves room for manual checks and accounting uncertainty. Expired daily `used` values reset transactionally on the next reservation; they are not today's usage. Provider limits and the account dashboard should be checked again before increasing work.

| Workload                                                |                        Maximum upstream requests |
| ------------------------------------------------------- | -----------------------------------------------: |
| Results browsing or saving                              |                              0 activity requests |
| One fresh stored destination/category observation       |                                                0 |
| One cold supported category                             |                                                1 |
| One cold destination with all five supported categories |                                                5 |
| 164 destinations × five supported categories            |                                              820 |
| Full weekly refresh at that catalogue size              | About 118/day on average, before failures/growth |

Museums, Beaches, Bars, Clubs and Markets are the only supported mappings. Unsupported interests make no source request. The production audit found three unexpired observation rows for 164 destinations; unexpired storage alone does not establish valid support or complete coverage.

A sensible starting **proposal for the next enrichment feature** is at most 50 cold category queries per run, three runs in separated hours, capped at 150/day. A 50-query batch leaves 150 of the existing 200 rolling-hour slots before visitor traffic; batches must stop when visitor usage consumes that headroom. This is an allocation proposal, not a new implemented reservation or fairness guarantee. Current code enforces the shared limits but does not reserve capacity specifically for visitors.

At 150/day, an entirely cold five-category catalogue of 164 places needs at least six days to cover, assuming successful calls and no competition. Weekly full coverage fits at most 210 destinations at that budget. Growth, failed calls, source outages and visitor use reduce that capacity; prioritize destinations/categories or lengthen refresh intervals rather than silently raising quotas. Warm observations should be skipped, and missing observations need priority so repeatedly restarting at the first destination cannot starve later places.

Failures consume reservations and are not refunded. Identical same-process calls share a promise; another process encountering the shared 60-second cooldown can temporarily return unknown instead of sharing the result. Process restarts, evictions and failed persistence can increase misses. Fresh observations persist across processes; expired examples remain useful context after refresh failure. At the shared hourly/daily/short-window ceiling, retrieval stops and the UI falls back to stale/unknown evidence while browsing and saving continue. No load benchmark or guaranteed concurrent-user count is claimed.

Activity background enrichment and new interest mappings are not implemented by this audit. Their scope follows #43; do not run unbounded per-result retrieval or spend production credits from CI.
