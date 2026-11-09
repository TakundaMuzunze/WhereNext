# Destination catalogue refresh

Implemented for #38 on 7 November 2026. GitHub owns acceptance/progress; this document records the source contract and rollout. The production migration was applied on 9 November. The first hosted Portugal preview stopped before writes on regional redirects; production apply and checkpoint resumption remain unverified.

The corrected code passed a local production preview on 9 November: 50 records scanned, 29 eligible destinations, 21 skipped, zero saved, next cursor `PT:Q18355583`. This does not verify the hosted workflow until the fix is merged and rerun.

## Source and identity

The importer joins country-scoped Wikidata items with English Wikivoyage articles. It requires a city article, usable/guide/star completeness, one primary Earth coordinate, matching Wikidata identity and revision provenance. Completeness is not destination quality or activity fit. Supported countries remain PT, ES, FR, IT, GR and MT; coverage excludes untranslated/missing/incomplete guides and is not an exhaustive geographical inventory.

[Wikidata structured data is CC0](https://www.wikidata.org/wiki/Wikidata:Data_access). [Wikivoyage permits commercial reuse with attribution and share-alike obligations](https://en.wikivoyage.org/wiki/Wikivoyage:Copyleft). Imports retain metadata, not copied guide descriptions. Imported details retain guide, revision/contributor and CC BY-SA links. Photos have separate validated Commons rights and attribution; a returned image URL alone is not permission.

Actual checks on 7 November: a two-record Portugal preview returned Castelo de Vide and Alcoutim with usable status and a resume cursor. A separate MediaWiki response resolved `Lisboa` to `Lisbon`, page 19798, Wikidata Q597, revision 5409287; the recorded fixture retains it. These establish particular contracts, not complete coverage or a load benchmark.

Identity handling follows the [MediaWiki query contract](https://www.mediawiki.org/wiki/API:Query#Resolving_redirects):

- Follow reported title normalization/redirects, then require the same Wikidata identity. Names, URLs and page IDs can update without replacing application IDs or saved references.
- Exclude incomplete and non-city guides before matching identities. If a requested article redirects to another destination's guide, count that source record as skipped coverage. Only the guide's matching Wikidata identity can become a candidate; never use the redirect to replace or merge destinations.
- Reject circular redirects, conflicting title mappings, duplicate source identities, stored page collisions and conflicting country assignments. The failed page and checkpoint roll back together, with an identifying error for review.
- Retain existing places after missing, incomplete, empty or failed updates. Never automatically merge Wikidata items, rewrite private shortlist identities, or deduplicate solely by coordinate proximity.
- A stored identity conflict needs review/correction of the source association before retrying. Skipped source records leave existing destinations and saved references untouched. Deleting saved places or resetting IDs is not a recovery procedure.

## Monthly cycles and bounded work

`CatalogueRefresh` stores each country's cursor, cycle start and completion. Each apply page saves destinations and its checkpoint in one transaction. A failed fetch/write leaves the previous checkpoint intact. Unfinished cycles resume even across month boundaries; completed countries are left alone until the next UTC month. Large countries may need several daily runs. Monthly completion is a target, not a guarantee.

Default: two pages of 50 records per country, at most 600 scanned records plus 12 look-ahead records and 24 HTTP requests across all six countries. Explicit operator runs accept `--max-pages 1` through `5`. Requests are sequential, with 30 seconds between source pages, 30-second request timeouts, `maxlag=5` on MediaWiki and no automatic retries. HTTP/lag/contract failures stop the run; later countries are listed as not attempted. Skipped and pending coverage remain visible.

A cycle reaching the query's end does not prove full country coverage. Upstream data can change during scanning; items inserted before the cursor are reconsidered next cycle. Existing unreturned records are retained.

This follows [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette) and the [identifying User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:User-Agent_policy). The default identifies the project repository; `DESTINATION_IMPORT_USER_AGENT` can supply another identifying contact. Public limits/availability may change; no guaranteed entitlement, new account, paid fallback or provider key is assumed. Broader shared capacity assessment remains #43.

## Overlap protection

GitHub concurrency serializes workflow runs. A nonblocking PostgreSQL advisory lock also serializes scheduled runs and manual apply imports against the same database. A competing run fails before source requests or writes.

Lock, reads and writes share one direct connection. Transaction-pooled session locks are unsafe: commands validate `DATABASE_URL` and `DIRECT_URL` target the same endpoint/database, allowing Neon's pooled hostname variant for the application URL, then use `DIRECT_URL`. Other proxy layouts require matching direct application configuration rather than assuming different endpoints are equivalent. PostgreSQL releases the lock when the connection/process ends; a lost connection cannot continue writes through another connection. Batch statements/row-lock waits are bounded.

Manual source-only previews still work without a database and do not acquire this write lock. Avoid overlapping independent previews when assessing pacing. Manual apply imports use the shared lock but do not advance automated monthly checkpoints.

## Commands and rollout

1. Keep local database values pointed at development for review; deploy the additive migration with `npx prisma migrate deploy`.
2. Preview: `npm run destinations:refresh -- PT --max-pages 1`.
3. Apply after review: `npm run destinations:refresh -- PT --max-pages 1 --apply`. Rerun to continue without pasting cursors.
4. Select production explicitly, for example using `DOTENV_CONFIG_PATH=.env.production`, before migration or production commands. Keep credentials out of logs, issues and Git.
5. The workflow reuses the existing GitHub `DIRECT_URL` secret for both connection variables. It must point directly to the intended application database. Run the manual workflow with apply unchecked first and review its summary before applying.

The workflow checks daily at 04:17 UTC, only on main and never on PRs/pushes. Scheduled runs apply; manual runs preview by default. Jobs have a 25-minute timeout. Actions summaries show counts, status, cursors and unattempted countries; failures exit nonzero and produce an annotation. Pending coverage is normal bounded work, not silently declared complete. A merged workflow is not proof its migration/configuration or first hosted run succeeded.

Catalogue refresh does not fetch photos, nearby activities or climate cells. New destinations may show unknown evidence/fallbacks until those separate enrichments run.

## Verification

Source tests cover normalization/redirects, skipped regional guides and mismatched identities, retained matching cities, cycles, malformed metadata, bounds and cursors. Disposable PostgreSQL command tests cover preview/apply, checkpoint resumption, monthly cycles, source/identity failure rollback, and shared manual/scheduled locking. Saved identities survive page updates. Guarded fixtures replace external responses and the fixed pacing delay; CI makes no Wikimedia requests. Workflow validation does not trigger hosted execution.
