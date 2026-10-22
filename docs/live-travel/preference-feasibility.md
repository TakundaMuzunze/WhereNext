# Automated destination evidence: observed feasibility

**Historical experiment only.** On 20 October 2026 SerpApi was rejected as a production dependency. These samples demonstrate possible evidence, not sustainable source selection. See [the non-flight provider review](non-flight-provider-review.md) for the Geoapify candidate and hotel-access limitations.

Investigation date: 18 October 2026 (Europe/London). This report records actual bounded data requests, separate from the [documentation mapping](preference-mapping.md). The user clarified during investigation that the frontend-era matching categories and 100-point engine may change. Affordability and useful preference matching remain the product requirements.

## Outcome

**Partial pass:** automatic retrieval of identifiable attractions and activity evidence works for sampled places inside and outside the local catalogue. It can reduce manual destination research. It does not establish complete preference coverage, travel-date availability, atmosphere, comparative destination quality or a production-ready enrichment service.

No application code, dependencies, database data or scoring behaviour changed. Temporary scripts performed the requests and retained selected summaries without the API key. Three SerpApi Maps requests succeeded, bringing cumulative successful SerpApi requests in this feasibility investigation to eleven of the agreed maximum twenty. Actual billed credit consumption was not independently checked. Three additional public Overpass requests succeeded; they do not use SerpApi credits. No pagination or automatic retries were used.

## Samples and method

Lisbon is in the existing catalogue. Florence and Český Krumlov are not. Each Maps request searched for tourist attractions using an explicit city/country query, English results and city-centred coordinates. Each returned twenty places with twenty distinct place IDs. This was one ranked page, not a complete inventory or a category-specific coverage measurement.

Each Overpass request queried mapped nodes, ways and relations within 4 km of the stated city centre, across seven tag selectors: museums, beaches, marketplaces, restaurants, nightclubs, spas and historic features. Counts represent raw OSM elements; they are not deduplicated venue totals or ranking scores. Up to three example elements per selector were inspected. No full geometry or broad recursive query was requested.

| Place         | Maps page / response time | OSM raw museum elements | OSM raw marketplace elements | Overpass response time |
| ------------- | ------------------------- | ----------------------- | ---------------------------- | ---------------------- |
| Lisbon        | 20 places / 2.5 s         | 67                      | 32                           | 20.1 s                 |
| Florence      | 20 places / 1.3 s         | 103                     | 13                           | 27.8 s                 |
| Český Krumlov | 20 places / 1.0 s         | 23                      | 1                            | 24.1 s                 |

Counts should not be used to conclude Florence is a better museum destination, or that Lisbon has better food markets. Query geometry, mapping detail, duplicates, category semantics and city scale affect them. This small sample does not establish European coverage or performance under load.

## What the responses support

- Maps returned stable place IDs, coordinates, explicit categories, ratings and review counts in the sampled records. Descriptions were absent for 10 of 20 Lisbon results and 13 of 20 Český Krumlov results; none were absent in the Florence page. Missing descriptions must not prevent processing of otherwise useful structured evidence.
- Museum-category examples included Carmo Archaeological Museum in Lisbon, Palazzo Vecchio and the Uffizi Galleries in Florence, and the Regional Museum in Český Krumlov. These support identified museum opportunities, not guaranteed opening on the requested dates or a promise of cultural depth.
- OSM independently supplied museum-tagged objects with names and, sometimes, opening hours and Wikidata IDs. Examples include Lisbon's Museu Geológico (`node/1623055925`), Florence's Galleria dell'Accademia (`node/560308250`) and the Moldavite Museum in Český Krumlov (`node/2820497107`). Matching entities across providers still requires reconciliation; independent providers do not automatically establish independent original verification.
- Named castle, monument, monastery and historical-landmark categories support more precise cultural/historical evidence than a generic “tourist attraction” label.

These are observations from responses, not externally verified venue audits. Source contracts describe the relevant fields and tags: [SerpApi Maps](https://serpapi.com/google-maps-api), [OSM tourism](https://wiki.openstreetmap.org/wiki/Key:tourism), [OSM amenities](https://wiki.openstreetmap.org/wiki/Key:amenity).

## Counterexamples that the matching model must handle

1. **Beach does not mean seaside:** the Český Krumlov query returned one unnamed `natural=beach` way (`743827051`) near this inland town. The tag does not establish a coastal beach, safe swimming or a beach holiday. [Beach semantics](https://wiki.openstreetmap.org/wiki/Tag:natural=beach)
2. **Market does not mean food market:** sampled marketplaces included a Lisbon flea market and a Florence leather market. Keep general markets separate from food-specific evidence. [Marketplace semantics](https://wiki.openstreetmap.org/wiki/Tag:amenity=marketplace)
3. **Listed does not mean open:** an OSM nightclub example in Florence, Auditorium FLOG (`node/2019559882`), had an opening-hours value stating in Italian that the venue had been closed for years. This illustrates conflicting/stale data; it is not an independently verified present-day closure finding. The broad category query alone would include it.
4. **Search location is not a boundary:** the Lisbon Maps page included Belém Tower 7.47 km from the supplied centre. It may be a relevant excursion, but differs from the OSM 4 km experiment. Straight-line distance does not establish travel time. The provider explicitly warns location is not a strict result boundary. [Maps location behaviour](https://serpapi.com/google-maps-api)
5. **Category names can overstate an experience:** a Český Krumlov bridge appeared with a hiking-area category. A point-of-interest category alone does not establish a worthwhile hiking route, difficulty or access.
6. **A zero can reflect a bad selector:** all three experimental `leisure=spa` counts were zero. This selector is deprecated/ambiguous and does not cover the diverse current spa tags. The result says nothing reliable about spa availability. [Spa tagging](https://wiki.openstreetmap.org/wiki/Spa)
7. **Historical does not mean visitor attraction:** broad historic results included memorials and wayside shrines. Visitor relevance and feature diversity require more selective rules than counting everything with a historic key.

## Proposed engine direction

This section is a proposal for discussion, not an accepted implementation design.

Separate **trip feasibility**, **preference fit** and **evidence coverage**. Budget, exact dates, validated route data and accommodation assumptions establish feasibility. Named opportunities and explicit categories support preference assessment. Coverage records what remains unknown; raw counts, review totals and missing fields are not a substitute for either suitability or confidence.

Keep directly evidenced signals such as museums, specific historic attractions, markets and explicit nightlife facilities distinct from derived claims such as romantic, relaxing or foodie. Derived trip styles are possible product judgements, but need understandable rules, examples and counterexamples rather than being presented as provider facts. Current labels can be refined where necessary, subject to user review.

Do not reuse the old percentage unchanged: exact string membership currently conflates missing evidence with a mismatch and implies comparable completeness. A replacement should show supported interests and gaps separately; the ranking policy still needs choosing and evaluating on representative travel scenarios. An LLM may later help interpret sourced information, but this investigation does not establish that generated labels improve ranking or verify prices.

## Operational implications and remaining proof

Maps provides useful structured records with a small request count in this sample, but each uncached destination/category search shares the same account allowance as flights and hotels. This cannot justify enriching all 75 discovered places synchronously on every planner submission. Price and place data have different change rates, so a bounded candidate set and permitted reuse of evidence deserve investigation; storage/display permissions, refresh policy and provenance must be settled before production caching.

The public Overpass queries demonstrate data availability, not a sustainable production service choice. They took 20–28 seconds each and the service's own guidance discourages using the public instance as the backend for a broad app. [Public instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)

Before implementation, review a proposed evidence model and matching policy with the user. Resolve category meanings, direct versus inferred claims, geography/reachability, freshness/closure handling and permitted provider use. Then evaluate affordable-and-suitable, cheap-but-unsuitable and suitable-but-over-budget scenarios. The automated evidence retrieval gate passes for this small subset; the combined recommendation engine remains to be designed and validated.
