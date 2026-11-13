# Background activity enrichment

Agreed on 11 November 2026. This is the operating policy for background activity evidence, separate from catalogue, photo and climate refresh. GitHub remains the source of issue progress.

## Budget and fairness

- At most 50 provider query attempts per run and 150 background attempts per UTC day, including manual runs and failed provider calls. Reading fresh stored evidence spends no query budget.
- The workflow schedules runs at 00:17, 08:17 and 16:17 UTC. GitHub schedules can be delayed; these are requested times, not a delivery guarantee.
- Background reservations leave 50 rolling-hour slots and 500 daily slots below the existing operator limits. Visitor requests can use that headroom; it is not a guarantee of future availability. Lower operator limits remain authoritative and can prevent background work entirely.
- At most one background attempt per observation reuse key per UTC day. The key includes canonical destination/category, geometry and translation version. A changed centre or version is different work. Advance past failures, retain earlier valid observations and retry on a later day.
- A full run allocates up to 40 queries to missing evidence and 10 to expired evidence. Transfer unused capacity between groups. Within each group, never-attempted work precedes older attempts; older expired observations break ties. Attempts persist across process restarts.
- Report fresh stored observations separately from supported assessments. Empty or incomplete evidence can remain unknown after successful retrieval.
- Retain the five existing mappings, evidence interpretation and shared provider limits. Unsupported interests remain unknown.

The database allowance lock covers background and visitor reservations together. Background daily accounting uses marked reservations; cleanup retains at least 24 hours and never refunds usage. A separate small attempt record retains fairness after reservation cleanup. The runner also holds a session advisory lock to reject overlapping manual or scheduled runs. Use a direct database connection.

A charged reservation can outlive a killed process before its HTTP request starts. Conservatively counting that reservation avoids accidental extra requests on restart. There are no automatic retries.

## User experience

Results already read stored observations and rank supported interests. Cards show a concise activity status, one supporting line and a compact retrieval date. Named venues, source links and full limitations stay on details. Seasonal availability and unchecked costs use plain secondary lines rather than additional panels. Pending retrieval, expired observations and incomplete samples have distinct labels. Unsupported interests are explained once above the results rather than repeated on every card; they remain unknown and do not affect activity ranking. Details also group unsupported interests separately.

Opening either imported or legacy details now reads stored evidence without calling providers. The optional check action retrieves missing evidence or refreshes expired evidence; fresh evidence is reused. Explore remains ordinary navigation preserving trip inputs. Saving is independent of activity checks. Photos and climate retain their separate existing behaviour.

## Failure and growth

Capacity or short-window limits stop the run normally and leave due work for later. Rejected credentials and provider throttling stop immediately. Three consecutive network/server failures stop the run; isolated invalid envelopes advance to other work. Database failures stop before further queries. Earlier successfully stored observations survive subsequent failures.

Summaries report due missing/expired work, same-day deferrals, successful storage, supported assessments and failures. A zero-request run caused by capacity is distinct from a completed catalogue. Ambiguous legacy guide centres are skipped rather than guessed.

At the recorded 164 destinations, five categories require 820 cold queries: at least six days at 150/day. Ideal weekly full refresh fits only 210 destinations before failures or visitor competition. The budget and seven-day freshness rule stay fixed as the catalogue grows; overdue coverage is reported and expired evidence remains unknown. Review actual coverage before revisiting priorities or allowance.

## Commands and rollout

`npm run destinations:activities` previews due work using database reads only. It requires DATABASE_URL and DIRECT_URL pointing to the same database; it requires no provider credentials and writes no progress or reservations.

`npm run destinations:activities -- --apply` requires the additive background enrichment migration, ACTIVITY_EVIDENCE_ENABLED=true and GEOAPIFY_API_KEY. Shared reservation or evidence storage errors fail closed. The command does not change provider account settings or enable live checks itself.

After review and merge:

1. Apply the additive migration through the established migration process.
2. Configure the GitHub Actions DIRECT_URL and GEOAPIFY_API_KEY secrets for the intended application database/project. Netlify configuration does not automatically populate GitHub Actions.
3. Set the repository Actions variable ACTIVITY_EVIDENCE_ENABLED=true deliberately when ready for scheduled queries.
4. Run the workflow manually in preview mode, then a bounded apply. Review its counts and stored evidence on results and details.
5. Observe a timer-triggered run and its summary before claiming hosted scheduling is verified. Disable the Actions variable to stop background provider retrieval without changing stored-evidence reads.

Fixture and disposable PostgreSQL tests exercise the runner without provider credits, while browser journeys exercise stored-only display and optional-check recovery. The separately approved initial live population is recorded below.

## Smaller discovery scope

The picker offers the five supported nearby activity categories and four explicitly climate-only sightseeing preferences: Walking tours, Architecture, Historic sites and Old towns. The latter compare historical conditions; they do not establish the presence of tours or attractions. Beaches have both a nearby-listing rule and a climate rule.

New discovery uses two steps and collects no budget or departure airport. A missing budget stays absent rather than receiving an invented amount. Older links retain validated budget, airport and unsupported-interest context through navigation and edits. Unsupported interests remain removable and unknown. Nights and adults are labelled as planning context rather than activity-ranking factors.

## Approved initial population — 11 November 2026

The user approved applying the additive enrichment migration to production, running one batch of at most 50 queries using its authoritative shared provider allowance, and copying compatible observations to development.

- Development had 71 destinations, two expired observations and no current activity evidence. Its pending catalogue-checkpoint and enrichment migrations were additive and were applied.
- Production had grown to 335 destinations. Only the enrichment migration was pending; it was applied after checking the migration history.
- Production preview: 1,671 missing categories, two expired categories and two reusable observations. The first apply attempted 50 queries, stored 50 observations and yielded 26 supported assessments, with zero failures. Due work fell to 1,623 categories. Production recorded exactly 50 background reservations for the UTC day.
- Fourteen fresh observations matched development identities, coordinates, categories, translation version and search geometry, and were copied with their original timestamps. Eleven compatible assessments were supported. Newer development observations were protected from overwrite. No provider requests or allowance copies were needed for this step.
- A real local Museums result read placed Castelló d'Empúries, Colònia de Sant Jordi and San Sebastián first with supported museum evidence.

This initial population was one manual bounded run. Production's 1,675 destination/category combinations already exceeded the ideal 1,050 weekly queries available at 150/day, before failures and visitor competition. Coverage therefore remains partial under the agreed budget and seven-day freshness rule. Development live retrieval remains disabled so it cannot independently spend against a second reservation store for the same project.

## Hosted verification — 13 November 2026

PR #65 is merged. GitHub Actions has the production direct connection, Geoapify secret and deliberate ACTIVITY_EVIDENCE_ENABLED=true repository variable. The [hosted manual apply](https://github.com/TakundaMuzunze/WhereNext/actions/runs/43110465167) stored 50 observations, with 17 supported assessments and zero failures.

Three timer-triggered runs were verified from their scheduled event and job summaries:

- [12 November, 07:08 UTC](https://github.com/TakundaMuzunze/WhereNext/actions/runs/43173096883): 50 attempted, 50 stored, 25 supported, zero failures.
- [12 November, 16:47 UTC](https://github.com/TakundaMuzunze/WhereNext/actions/runs/43262494437): 50 attempted, 50 stored, 24 supported, zero failures.
- [13 November, 06:43 UTC](https://github.com/TakundaMuzunze/WhereNext/actions/runs/43380670587): 50 attempted, 50 stored, 24 supported, zero failures. Its starting snapshot had 202 fresh observations and 1,783 missing combinations; 1,733 remained due after the run.

These executions prove hosted scheduling works, not punctual or complete delivery of every requested slot. Catalogue growth increased the snapshot to 397 destinations and 1,985 category combinations. The budget and freshness rule remain unchanged. Production results and details showed stored evidence without an explicit check; live provider requests were not needed for the release smoke checks. Final release verification is recorded in [#44](https://github.com/TakundaMuzunze/WhereNext/issues/44).
