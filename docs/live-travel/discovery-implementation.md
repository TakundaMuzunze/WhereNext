# Bounded destination discovery

The dated planner's results page has an explicit **Find destinations** action. The legacy matching flow and static destination guides remain available. No dependencies were added for this implementation.

## Architecture

- `DiscoveryPanel` submits the validated trip to `POST /api/discovery`, renders loading/retry/empty/partial states and displays source-backed reasons and partial costs. Navigation/prefetch does not spend provider credits.
- `discoverDestinations` validates the dated request, requests cached GBP return fares, filters exact dates/airport and supported countries, and compares at most four cheapest distinct destinations.
- Travelpayouts' city catalogue supplies city codes, country and approximate coordinates. GeoNames resolves geography using the secure hostname, country and proximity; ambiguous or unavailable resolution leaves activity evidence unknown.
- Up to two directly mapped activities per destination use Geoapify Places within 4 km, at most 20 records per query. Supported initial mappings: Museums, Beaches, Bars, Historic sites, Nature parks. Generic restaurant records do not establish the “Local restaurants” preference; it remains unknown. Other preferences remain visible as unverified. A beach record does not establish a seaside holiday, and national-park evidence does not verify hiking suitability.
- `rankDiscovery` orders incomplete estimates by positive budget remaining, supported activity count, estimated group flights, then stable ID. It does not reuse the old 100-point score.
- External destinations are not yet saveable. Old IDs and shortlist behavior are unaffected.

## Configuration and database

Server-only `.env` variables:

```dotenv
TRAVELPAYOUTS_API_TOKEN=...
GEONAMES_USERNAME=...
GEOAPIFY_API_KEY=...
```

Development enables discovery when all three are configured. Production additionally requires `LIVE_DISCOVERY_ENABLED=true`. Set `LIVE_DISCOVERY_ENABLED=false` to disable it everywhere. SerpApi flags cannot select this flow.

Apply `20261020120000_add_search_allowance` with `npx prisma migrate deploy`. This creates the existing shared allowance/reservation tables; no new migration is needed for the replacement providers. The migration was applied to the configured development database on 20 October 2026.

The first request initializes each replacement provider's allowance. Defaults are conservative local ceilings, not purchased entitlements: Travelpayouts 5,000/day and 300/hour, GeoNames 8,000/day and 800/hour, Geoapify 2,500/day and 200/hour. Operators can lower `limit` and `hourlyLimit` in `SearchAllowance` (zero disables requests). Days reset at UTC midnight; hourly usage is rolling. Use a dedicated key/project or reserve room for usage outside this app. Geoapify limits assume every Places query returns at most 20 results; adding endpoints requires revisiting credit accounting.

Every cache miss reserves capacity transactionally before network work. Failed calls retain the charge; requests have an 8-second timeout and no retries or redirects. Identical requests are coalesced in a bounded 200-entry process cache: fares 15 minutes, city catalogue 24 hours, geography/evidence 7 days, failures 60 seconds. A shared 60-second duplicate reservation suppresses identical misses on other instances; those instances may temporarily show unknown/error rather than share results. Cache eviction/restarts can increase usage; the database ceilings remain shared and authoritative. This is not a distributed result cache or per-user abuse limiter. Reservation retention needs an operational cleanup policy before sustained rollout.

The endpoint rejects browser cross-origin requests, but it is public. Shared quotas cap upstream usage, not service fairness: an abusive client can exhaust the app allowance. Add deployment-level rate protection before public rollout.

## Price and evidence contract

Fares are cached previously found ticket prices, assumed per adult, not verified group offers. Dates and origin are checked; return airports, baggage, booking fees, current availability and seats must be checked onward. Retrieval time is not fare observation time. The displayed timestamp is retrieval by this application; a cached response can be older. Accommodation is unknown and omitted from the partial sum, never treated as zero-cost lodging.

Remaining budget = group budget − cached ticket price × adults − daily allowance × adults × (nights + 1). Positive remaining budget is not verified affordability. The shortlist is not exhaustive; filtering after the provider's 1,000-record cap can miss eligible destinations.

All external response envelopes and individual rows are runtime-validated. Malformed rows are skipped; failed flight envelopes fail the search. Failed geography/evidence calls retain flight estimates with explicit unknowns. GeoNames/OpenStreetMap/Geoapify attribution appears with results. Activity records do not verify current opening hours, quality, transfer feasibility or subjective trip style.

## Verification

Service tests exercise joins, exact airport/dates, currency, cost arithmetic, invalid input, country filtering, ambiguity and partial failures. UI tests cover explicit search, empty-cache semantics and recovery. Disposable Postgres tests exercise cache coalescing, quota concurrency, failed-call accounting, daily reset and rolling-hour ceilings. Use `npm test`, `npx tsc --noEmit`, and `npm run test:flights:db`.

### Completed checks (20 October 2026)

- Full unit/component/route suite: 358 tests across 40 suites passed; TypeScript and targeted ESLint passed.
- Disposable Postgres suite: 19 integration tests passed, including the retained experimental SerpApi guard tests.
- Real application POST: Heathrow 10–14 November returned Faro, GeoNames ID 2268339, cached ticket £142, estimated two-adult flights £284, spending allowance £300 and £1,416 remaining before accommodation/extras. Geoapify supplied Museu Regional do Algarve and other named museum records.
- Headless Chromium at 390px width: the actual search button returned Faro and museum links, showed accommodation uncertainty, and had no horizontal overflow. Screenshot inspected locally.

The existing development server needed restarting to serve the current route reliably. It is running on port 3000. No production deployment, commit or GitHub issue status change was made.

### Branch preservation checks (22 October 2026)

The branch is being preserved for review as cached-fare exploration, alongside the revised destination-first specification. It does not implement that revised journey. Type checking, the 360-test unit/component/route suite (including two review regressions) and all 19 disposable-Postgres integration tests passed again. No hosted database was used for these integration checks.

Review identified two evidence-validation corrections: reject out-of-range city/POI coordinates, and leave “Local restaurants” unknown because generic restaurant categories do not establish local cuisine or ownership. The provider guard, cost arithmetic and dated inputs remain reusable; destination sourcing and seasonal evidence are still unresolved.
