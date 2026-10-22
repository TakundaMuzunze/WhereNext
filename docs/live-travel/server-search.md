# Server flight search protection

**Current application flow:** see [bounded discovery implementation](discovery-implementation.md). The dated results page now uses `discoverDestinations`, independently of the disabled legacy flight-only entry described below.

Status: SerpApi production selection withdrawn on 20 October 2026. The normal `searchFlightOptions` entry validates a trip and returns unavailable without loading a provider, making a network request or spending a reservation. The existing SerpApi implementation is preserved in an explicit experimental module, not selected by the application. The allowance guard and database tests remain useful prototype work.

SerpApi's free 250-search monthly quota is rejected for production. Setting the old enable flags must not activate it through the normal search entry. Ongoing API access must be free; the new cached discovery slice is authorised, while a live group-pricing replacement remains unresolved. See [the production review](production-provider-review.md) and [the specification](spec.md).

## Boundaries

`src/features/destination-discovery/server/searchFlightOptions.ts` still accepts unknown input and validates the completed dated trip using today's Europe/London date. Invalid input returns invalid-request; valid input returns unavailable until a suitable production source is implemented. Server modules use `server-only` and are not exported through the client-safe feature barrel.

The preserved `experimental/serpApiFlightSearch` module contains the earlier success, empty, duplicate and provider-failure handling. It requires `SERPAPI_FEASIBILITY_ENABLED=true` and refuses to execute when `NODE_ENV=production`, even if every old configuration flag is present. Its explicit feasibility configuration is not a way to select a production source.

The experimental search sends one round-trip economy Explore request for Europe, English, UK and GBP. Country eligibility is still checked by the parser. It performs no pagination, destination fan-out, automatic retries or redirects. Fetch and body reading share a 20-second abort timeout; Next.js fetch caching is disabled. Provider errors and credential-bearing URLs are neither logged nor returned.

The provider's own cache can still be used: a new retrieval does not imply fresh airline inventory. No raw responses, result images, descriptions or offers are persisted in this slice. Price display and result caching require the permitted-use review before activation.

Provider references checked on 20 October 2026: [Explore parameters and caching](https://serpapi.com/google-travel-explore-api), [account allowance fields](https://serpapi.com/account-api). Documentation and successful access do not establish group-price meaning or permission to reuse third-party content.

## Shared reservation

`SearchAllowance` holds one `serpapi` budget shared by all engines and server instances using this database. The migration seeds a closed allowance: zero total requests, zero hourly requests and an expired timestamp. It does not alter existing user or shortlist records.

Before contacting SerpApi, a short database transaction locks the allowance row with `SELECT ... FOR UPDATE`. While holding it, the guard checks expiry, remaining budget, an identical-request cooldown and usage within the preceding 60 minutes. Only then does it increment `used` and insert a `SearchReservation`. Both writes commit together. Network access happens after the transaction, so slow searches do not hold the lock.

The database clock controls reservations. Requests with an identical provider-parameter hash are blocked for 60 seconds from reservation, including after errors, timeouts or process crashes. The key includes every sent search parameter, the normalization policy version and the verified price basis. Budget, daily allowance and preferences are omitted because they do not affect this flight-only request. No key contains credentials.

Duplicates receive `duplicate` with `retryAt`; this is request suppression, not cached-result sharing. Other callers do not automatically receive the first caller's results. The future UI must explain that another search is in progress/recently ran and offer a deliberate retry.

Failed or abandoned requests retain their reservation: the provider may have charged before the client timed out. There are no automatic refunds or resets. The total is an explicitly allocated budget ending at `expiresAt`, not an assumed calendar billing month. The rolling hourly limit spans budget renewals because reservations are retained.

## Preserved feasibility configuration, not production activation

Do not expose this prototype as production search. For a separately authorised non-production feasibility exercise only, these are the old configuration checks:

1. Confirm the passenger price basis against the source and record the evidence. `SERPAPI_VERIFIED_PRICE_BASIS` is a configuration assertion, not proof.
2. Record the provider/source display and storage conditions. Set `SERPAPI_PERMITTED_USE_REVIEWED=true` only after review.
3. Check actual account credit balance, hourly limits and billing-cycle end. Allocate a smaller application budget, leaving headroom for earlier feasibility work and any other key usage.
4. Apply the migration through the normal deployment process. Configure the `serpapi` row with a reviewed `limit`, `hourlyLimit` and `expiresAt`. Start with a small bounded allowance. Never delete reservations or reset `used` merely to recover from a failed search. Renew a budget only after reconciling provider consumption.
5. Explicitly opt into the experimental function using `SERPAPI_FEASIBILITY_ENABLED=true` in a non-production runtime, plus server-only `SERPAPI_API_KEY`, `SERPAPI_VERIFIED_PRICE_BASIS` (`per_adult` or `total_party`), `SERPAPI_PERMITTED_USE_REVIEWED=true`, and `FLIGHT_SEARCH_ENABLED=true`. The normal application entry ignores these prototype settings. Never prefix credentials with `NEXT_PUBLIC_`.

Any authorised experimental SerpApi requests must reserve against this same row. Separate databases/deployments, scripts and manual dashboard requests cannot be metered by this database. No automatic reset, subscription, credit purchase or paid fallback is allowed. A replacement provider's rate/credit policy must be modelled explicitly rather than inheriting a SerpApi monthly assumption.

On database failure or exhausted/expired allowance, return unavailable. No local catalogue data is substituted as current flight prices. Do not automatically retry provider failures. A manual repeat after the cooldown requires another reservation.

## Verification

`npm run test:flights:db` preserves the prototype's disposable-Postgres tests: all migrations applied from scratch and explicit experimental search calls with stubbed provider HTTP. It never reads or writes the project database or makes live SerpApi requests. A separate normal test confirms that the application entry cannot activate SerpApi using its old flags. The database suite also confirms that the experimental module cannot execute in production.

Cases cover concurrent duplicates, distinct requests competing for the total/hourly limits, input/configuration errors, expired/missing allowances, database failures, empty/malformed responses, HTTP/network failures, timeout cancellation, retained usage and parameter separation. Normal CI does not use real provider credits. The existing mapper tests still cover malformed individual candidates and exact money handling.
