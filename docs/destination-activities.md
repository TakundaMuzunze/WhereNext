# Activity evidence for destinations

Activity evidence is independent of flights, dates and costs. The first rules assess named museums, beaches, bars, nightclubs (the current `Clubs` preference) and markets. These rules establish nearby listing evidence, not destination quality, opening on travel dates, safe swimming, quietness, coastal access or local ownership. Other interests remain explicitly unknown.

## Request and interpretation

`POST /api/destinations/[id]/activities` accepts `{ activities: string[] }` with 1–10 entries of at most 80 characters. The server validates the destination against the catalogue/verified guide identities, deduplicates requested interests and queries at most five supported categories sequentially. Unsupported requested interests are retained as unknowns.

The recorded destination coordinates define a 4 km circle, independently of any airport. This is a bounded nearby sample, not a validated visitor catchment or a complete inventory. Coordinates may be approximate. A legacy guide without exactly one imported location has unknown geography; no manual coordinate list or airport fallback is introduced.

Validated observations retain provider place IDs, category lists, coordinates, OSM source links, query geometry, result limit and retrieval time. Restricted/closed records cannot support an interest. Duplicate source IDs/OSM objects are removed during translation. Likely same-name node/area duplicates within 50 metres are collapsed in display examples, while the separate observations remain available. Other real-world duplicates can remain and are disclosed. Counts never become quality scores.

A capped response (20 records), malformed/unnamed rows or out-of-scope/category records leave the assessment unknown, with usable examples retained. Empty results are unknown, not evidence of absence. Generic marketplaces do not prove food markets; a beach can be inland. The model distinguishes supported, contradicted and unknown, but this initial listing source cannot establish destination-wide contradiction. A closed venue therefore never produces that outcome.

## Reuse, failure and free usage

`DestinationActivityEvidence` stores validated source observations separately from traveller assessments. Reuse keys include canonical destination identity, provider, translation version, category, coordinates, radius and result limit. They exclude party details, travel dates, prices and private shortlist state. Coordinates changing invalidates reuse. Reads validate both shape and scope before using persisted JSON.

Evidence is reused for up to seven days from its original retrieval time. Refresh is on demand; there is no activity refresh schedule. If refresh fails, earlier examples remain available with their original time and an unknown/stale assessment. Failed or malformed source envelopes receive a short process cooldown rather than week-long reuse. A missing cache migration fails closed before spending credits.

Live retrieval requires both `ACTIVITY_EVIDENCE_ENABLED=true` and `GEOAPIFY_API_KEY`; the default is disabled. Existing persisted evidence remains readable when live retrieval is disabled. Details expose a deliberate check button, so opening or saving a place does not itself trigger provider requests. Retry preserves requested interests and uses valid cached work.

The existing shared Geoapify guard remains authoritative across app instances: defaults are 2,500 daily and 200 rolling-hour requests, with lower operator-set limits preserved. This slice adds a conservative four reservations per rolling second and paces cold category queries by 300 ms. At five cold categories per destination, the default ceiling allows at most 500 full cold checks per day and 40 per hour before other usage, failures or retries; persisted reuse reduces repeated calls. These are capacity bounds, not load benchmarks or a public traffic guarantee. Requests returning at most 20 places cost one credit under the published contract. No automatic retries, paid fallback or account changes are introduced.

Geoapify's public free plan currently lists 3,000 daily credits and five requests per second and permits production use with attribution. Its Places terms permit storage/reuse with attribution to Geoapify and OpenStreetMap. The application displays both links. The account dashboard's remaining credits were not independently inspected; public limits do not prove unused account capacity. Any other use of the same account must fit within its shared allowance.

Expired-row cleanup and deployment-level abuse protection remain operational follow-ups before sustained public use, alongside the existing reservation cleanup work. This slice does not enable production retrieval or change the planner/ranking policy. The assessment service is available for #42's imported-catalogue results integration. Seasonal suitability remains #48's separate evidence decision.

## Verification and rollout

A bounded check on 3 November 2026 made 15 successful Places requests: five categories each for Faro, Castelo de Vide and Alcoutim, using Wikidata coordinates. Actual responses showed duplicate Faro museum listings, a capped bar sample, unnamed records and an inland beach. Sanitised representative fixtures omit credentials, contact details and unrelated properties. The published contract implies 15 Places credits for that check; dashboard consumption was not measured.

Pure assessment tests cover claim boundaries and examples. Request-handler tests use disposable PostgreSQL and external HTTP fixtures to cover identity, provenance, persisted reuse, changed geometry, malformed/empty/capped responses, disabled retrieval, exhausted allowances, stale recovery and migration outage. Browser tests cover imported/legacy details, explicit checks, retained inputs, retry and mobile layouts. No CI test spends provider credits.

Run `npm run test:shortlists:db -- --browser` to apply migrations to a disposable database, build with Webpack and run the relevant browser journeys. Production rollout requires reviewing/applying the additive evidence-cache migration, checking account capacity and explicitly enabling retrieval. None of those hosted changes are applied by these tests.

Sources checked on 3 November 2026: [Places API/category contract](https://apidocs.geoapify.com/docs/places/), [credit costs](https://www.geoapify.com/pricing-details/), [free-plan limits](https://www.geoapify.com/pricing/), [Places storage/attribution FAQ](https://www.geoapify.com/places-api/).
