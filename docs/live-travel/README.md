# Destination discovery and travel-cost checking

The dated results page now has a bounded external discovery search using Travelpayouts cached flight estimates, GeoNames geography and Geoapify activity evidence. The legacy planner still uses the local catalogue. Accommodation, live group quotes and persistence of external destinations remain follow-up work.

**Product direction agreed 20 October 2026:** discover destinations and seasonal/activity suitability first, then check travel costs for chosen places. Budget fit may remain unknown during discovery. The [canonical specification](spec.md) supersedes the earlier exact-date-first journey. Destination candidate sourcing and seasonal evidence remain unresolved prerequisites.

**Previously implemented slice:** the user authorised this initial cached-estimate slice after reviewing real responses and their limitations. SerpApi remains rejected for production. See [implementation and setup](discovery-implementation.md), [replacement API tests](replacement-response-check.md) and [GeoNames tests](geonames-response-check.md). The later successful test of `secure.geonames.org` resolves the earlier insecure-hostname limitation.

[Provider prerequisite #48](https://github.com/TakundaMuzunze/WhereNext/issues/48) remains relevant to the broader live holiday scope, especially accommodation. GitHub delivery statuses have not yet been reconciled with this local implementation.

## Sources of truth

- [Specification](spec.md): agreed product scope, implementation constraints, testing approach and learning checkpoints.
- [Server search protection](server-search.md): shared request reservations, configuration, failure behaviour and activation requirements.
- [GitHub delivery tracker #36](https://github.com/TakundaMuzunze/WhereNext/issues/36): the eight delivery issues, their acceptance criteria, blocking relationships and progress. Ticket bodies are maintained only on GitHub.
- Research reports below: dated evidence and limitations. They do not override the specification or establish current provider pricing indefinitely.

## Research evidence

- [Data sources](data-sources.md): provider options, access constraints, data semantics and source documentation.
- [Production flight-provider review](production-provider-review.md): current access and capacity constraints, including cached versus live pricing.
- [Non-flight provider review](non-flight-provider-review.md): Geoapify evidence capacity and unresolved free hotel-search access.
- [Flight and accommodation feasibility](flight-feasibility.md): eight actual search requests, observed date/party/price behaviour and unresolved assumptions.
- [Preference evidence feasibility](preference-feasibility.md): three actual place searches and three bounded map queries, with concrete category and coverage counterexamples.
- [Preference mapping](preference-mapping.md): analysis of the frontend-era taxonomy and the distinction between direct evidence, derived judgements and unknowns. This is a reference for redesign, not a requirement to preserve the old rules.

## Starting implementation

Reconcile the existing GitHub delivery issues with the revised specification before treating their blocking relationships as the implementation sequence. First prove destination sourcing independent of fares and seasonal evidence; discovery does not depend on complete price coverage. Explain the relevant architecture and trade-offs before significant changes; preserve the user-led evidence, validation, identity/persistence and ranking checkpoints. Keep server credentials local and request usage bounded. Free-text preferences are a later follow-up after evidenced structured matching works.
