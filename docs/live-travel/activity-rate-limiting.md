# Activity-check rate limiting

The activity evidence POST endpoint is public. Shared provider ceilings protect the account-wide allowance, but one caller could otherwise repeatedly request checks across destinations. This slice adds a Netlify edge rule in `netlify/edge-functions/activity-rate-limit.ts`.

## Policy

- Applies to POST paths ending in `/activities` (`/*/activities`), across destination IDs on the same domain. The broader prefix covers repeated-slash aliases that Netlify can route without a canonical redirect; authentication and saving paths do not match.
- Starts at 10 requests per 60 seconds, aggregated by client IP and domain.
- Netlify blocks excess requests with HTTP 429. The activity panel explains that the visitor should wait a minute before trying again, preserves previous evidence and retrieval times, and leaves saving available.
- Allowed requests continue to Next.js without the edge handler reading the body or changing the response. There is no local counter, database write, additional API key or SDK dependency.

This is a deployment policy, not a new provider quota. It counts activity requests even when the evidence is already cached or an interest is unsupported. The existing database-backed provider allowance/reservation guards remain the authority for total provider spend. Local `next dev`, `next start` and ordinary browser tests do not enforce Netlify's hosted limit.

## Limits and trade-offs

The starting threshold is an operational choice, not a measured capacity benchmark. Users sharing a network share the IP limit, and a visitor changing IPs or domains may get separate allowances. Netlify documents an enforcement delay of up to ten seconds after crossing the threshold, so some additional requests can reach the app. This cannot guarantee fair access against distributed abuse or replace provider quotas. No claim of exact per-user accounting is made.

The rule targets activity checks, including nonexistent routes with the same suffix. The legacy `/api/discovery` endpoint is retired with HTTP 410 and cannot contact providers. Catalogue reads and saving do not call activity providers.

Netlify currently supports code-based rules on all plans; free projects have a limited rule allowance. This uses one rule. Edge execution and normal site traffic remain subject to the existing hosting plan limits; no paid service or upgrade was enabled. See [Netlify rate limiting](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/) and [edge request-chain behaviour](https://docs.netlify.com/build/edge-functions/api/#modify-a-response).

## Deploy-preview verification

Local verification covers the exported policy and the browser response to a plain-text 429. It does not emulate Netlify's counters or prove that a deployed rule is installed.

1. Open the deploy preview's post-processing log and confirm it explicitly lists this rule with the expected path, threshold and IP/domain aggregation. A successful deploy alone is insufficient: Netlify documents that invalid or undetected rate-limit rules may not fail deployment.
2. Use a preview with live activity retrieval disabled (`ACTIVITY_EVIDENCE_ENABLED=false`) and verify that the preview has no active provider credentials. Keep hosted checks bounded and avoid spending provider credits.
3. Send activity POST requests to that preview for different imported destination IDs from the same client. Verify allowed responses still reach the activity API with intact bodies. After crossing the threshold, allow for the documented enforcement delay and verify a 429. Do not send an unbounded load test or assume the eleventh request must be blocked immediately.
4. Confirm the UI's message, previous evidence, saving and trip context remain usable, then verify checks recover after the restriction clears. Confirm normal destination navigation is unaffected.
5. Verify a separate network is independently counted if available. Review route aliases/trailing-slash canonicalisation and any adapter-exposed internal routes; do not declare hosted protection complete if a public alternate entry bypasses the intended path rule.

The earlier narrow rule was observed on production and returned 429 for canonical, encoded and trailing-slash requests on 9 November. A repeated-slash alias still reached validation, motivating the broader prefix in this branch. Verify the updated deployment rule and that alias after merge. [The resilience audit](discovery-resilience.md) records the hosted checks, cleanup evidence and free-capacity assessment; this is not a load benchmark.
