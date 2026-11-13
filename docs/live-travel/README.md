# Destination-first discovery

WhereNext discovers places from stored destination, activity and historical climate evidence. Travellers can explore and privately save destinations without choosing an airport, exact dates or a budget. Nearby listings do not verify quality, opening or access; historical climate is not a forecast. Incomplete trip costs remain unknown.

## Current delivery — 13 November 2026

The destination-first planner, imported details, private shortlists, seasonal guidance, discovery resilience and bounded background activity enrichment are merged. Production smoke checks and release validation are recorded in [release issue #44](https://github.com/TakundaMuzunze/WhereNext/issues/44). GitHub owns current acceptance criteria and progress; older research and implementation reports describe the state when written.

Catalogue refresh, activity enrichment, photos and climate have separate policies. Catalogue refresh requests bounded daily work through monthly country cycles. Activity enrichment requests three separated runs per day, with at most 50 queries per run and 150 background attempts per UTC day inside shared provider limits. Timer-triggered activity runs have been verified; requested schedule times are not delivery guarantees. Growing catalogue coverage remains partial.

Chosen-destination travel-cost checking remains later [#40](https://github.com/TakundaMuzunze/WhereNext/issues/40) work. Earlier cached-flight experiments do not provide complete holiday prices or live group quotes. Accommodation access remains unresolved. Photo slideshows are parked; free-text preferences, bookings and payments remain outside this release. No paid fallback or SerpApi production activation is authorised.

## Sources of truth

- [Specification](spec.md): agreed scope and implementation constraints.
- [Delivery tracker #36](https://github.com/TakundaMuzunze/WhereNext/issues/36): current delivery progress and later work.
- [Background activity enrichment](background-activity-enrichment.md): allowance, fairness, stored-evidence UX and rollout.
- [Catalogue refresh](catalogue-refresh.md): identities, source attribution, bounded refresh and coverage limits.
- [Seasonal guidance](seasonal-guidance.md): historical baseline, interpretation and review policy; its initial implementation notes predate production rollout recorded in GitHub.
- [Discovery resilience](discovery-resilience.md): recovery, shared capacity and operational evidence.
- [Server search protection](server-search.md) and [activity rate limiting](activity-rate-limiting.md): shared reservations and visitor request protection.
- [Provider reservation cleanup](provider-reservation-cleanup.md): retention and scheduled maintenance.

## Dated research and earlier implementation

These reports preserve provider evidence and earlier decisions. They do not override the specification, current issue status or establish current provider terms indefinitely.

- [Data sources](data-sources.md), [production provider review](production-provider-review.md) and [non-flight provider review](non-flight-provider-review.md).
- [Flight and accommodation feasibility](flight-feasibility.md), [replacement response checks](replacement-response-check.md) and [GeoNames response checks](geonames-response-check.md).
- [Preference feasibility](preference-feasibility.md) and [preference mapping](preference-mapping.md).
- [Earlier cached-estimate implementation](discovery-implementation.md).
