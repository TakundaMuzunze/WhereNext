# Automated preference evidence: mapping and limits

Research date: 18 October 2026 (Europe/London). Documentation investigation only; no authenticated requests or SerpApi credits used for this mapping. It complements [the observed travel API results](flight-feasibility.md) and [enrichment research](data-sources.md). Recommendations below are proposals for review, not additional user-agreed scope or a final architecture.

Scope clarification from the user: the existing rules, weights and activity taxonomy are a frontend-era baseline, not requirements to preserve. The mapping below diagnoses that baseline; gaps do not require retaining or recreating every label. The new engine may be redesigned around the agreed product goal and available evidence.

## Conclusion

Automatic evidence can support a useful subset of current preferences without manually researching every destination. It does not yet support all current labels reliably. Start by proving named places and explicit categories, then distinguish those observations from claims about atmosphere, quality, date availability and overall suitability. No live coverage measurement is established by this documentation review.

## Source capabilities

OpenStreetMap (OSM) represents tourist features as nodes or areas; museums, accommodation and viewpoints are examples. Access and fee tags may add context. These describe mapped objects rather than an editorial destination recommendation. [OSM tourism](https://wiki.openstreetmap.org/wiki/Key:tourism)

Amenities include restaurants, bars, nightclubs, music venues and markets; natural features include beaches, while leisure features describe recreational facilities. These families offer candidate categories, with field-specific interpretation required. [Amenities](https://wiki.openstreetmap.org/wiki/Key:amenity), [natural features](https://wiki.openstreetmap.org/wiki/Key:natural), [leisure](https://wiki.openstreetmap.org/wiki/Key:leisure), [marketplaces](https://wiki.openstreetmap.org/wiki/Tag:amenity=marketplace)

Overpass supports tag and spatial filters across nodes, ways and relations. Queries should be geographically constrained, not global scans for common tags. It is a feature query system, not a fuzzy city-name resolver. Its public service discourages becoming the general backend for a broad public application. [Tag queries](https://dev.overpass-api.de/overpass-doc/en/criteria/per_tag.html), [public service guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)

SerpApi Maps local results can include place IDs, coordinates, categories, ratings, review counts and hours. Fields are optional, and results are not guaranteed to remain inside the requested geography. A category supplies place evidence; a rating supplies aggregate reviewer opinion, not proof of romantic atmosphere or destination-wide quality. Pagination and review/detail enrichment increase search use. [Maps local results](https://serpapi.com/maps-local-results), [shared search allowance](https://serpapi.com/pricing)

Wikidata structured queries can connect identified entities, classes and coordinates, including spatial searches. Proposed use: reconcile a destination's identity and link notable POIs. Missing statements are unknown, and class relationships need inspection; a city record alone is not an activity inventory. [Query Service manual](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual)

## Current activity mapping

All 37 unique activity labels in `src/shared/data/tripTypes.ts` are listed below. **Direct** means an explicit feature/category could support existence, not guaranteed coverage or availability. **Derived** needs a defined rule or extra contextual evidence. **Insufficient** means the reviewed contracts do not establish a dependable signal for the full label. These are proposed mapping assessments.

| Current label     | Evidence class      | Candidate evidence and limit                                                                                      |
| ----------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Romantic dinners  | Derived             | Restaurant existence is direct; romance needs explicit contextual evidence, not a high rating.                    |
| Sunset views      | Derived             | Mapped viewpoint plus orientation, terrain and access; a generic viewpoint does not establish sunset visibility.  |
| Beach clubs       | Direct, conditional | Explicit Maps beach-club category; a beach with a nearby bar is insufficient.                                     |
| Spa days          | Direct, conditional | Explicit spa facility/category and access details; spa mapping is heterogeneous.                                  |
| Luxury stays      | Derived             | Accommodation class/amenities and an actual suitable offer; expensive does not automatically mean luxury.         |
| Museums           | Direct              | `tourism=museum` or an explicit Maps museum category; dates/opening still separate.                               |
| Shopping          | Direct, broad       | Explicit retail places/centres; number of shops does not prove a worthwhile shopping trip.                        |
| Food markets      | Derived             | Marketplace plus explicit food specialism; generic market evidence alone insufficient.                            |
| Architecture      | Derived             | Identified notable buildings/styles; generic buildings or city status do not prove architectural appeal.          |
| Cocktail bars     | Direct, conditional | Explicit cocktail-bar category or documented service; generic bar evidence insufficient.                          |
| Beaches           | Direct              | `natural=beach` or explicit beach category; access, weather and swimming suitability separate.                    |
| Boat trips        | Direct, conditional | Explicit excursion operator/product; marina or boat rental alone does not establish a scheduled trip.             |
| Swimming          | Derived             | Swimming facility/bathing place with public access; beach existence does not prove safe swimming.                 |
| Island hopping    | Insufficient        | Requires islands plus practical inter-island transport, schedules and feasible itinerary.                         |
| Hiking            | Direct, conditional | Mapped hiking routes, with access/difficulty assessed separately; an arbitrary path is insufficient.              |
| Waterfalls        | Direct, conditional | Explicit waterfall feature/category; location, access and seasonal flow still matter.                             |
| Road trips        | Insufficient        | Roads/car hire do not establish a suitable scenic route or feasible itinerary.                                    |
| Nature parks      | Direct, conditional | Explicit nature reserve/protected nature area; an urban park is not automatically equivalent.                     |
| Hidden gems       | Insufficient        | Subjective/relative popularity claim, not a stable mapped category.                                               |
| Street food       | Derived             | Explicit street-vendor or food-stall evidence; ordinary fast-food restaurants are insufficient.                   |
| Local restaurants | Derived             | Restaurant existence direct; local cuisine/ownership requires explicit evidence and an agreed meaning of “local”. |
| Food tours        | Direct, conditional | Explicit tour product/operator; food venues alone insufficient.                                                   |
| Markets           | Direct              | Explicit marketplace/category, with operating dates checked separately.                                           |
| Cooking classes   | Direct, conditional | Explicit class provider/product; restaurants alone insufficient.                                                  |
| Bars              | Direct              | `amenity=bar` or explicit Maps category.                                                                          |
| Clubs             | Direct              | `amenity=nightclub` or explicit nightclub category, not any organisation called a club.                           |
| Beach parties     | Insufficient        | Needs dated event/programme evidence; beach plus nightclub is insufficient.                                       |
| Live music        | Direct, conditional | Music venue/category; performance on requested dates requires event evidence.                                     |
| Rooftop drinks    | Derived             | Bar plus explicit rooftop/service context; upper-floor location alone insufficient.                               |
| Quiet beaches     | Derived             | Beach evidence plus credible crowd/noise context; low review counts do not establish quietness.                   |
| Resorts           | Direct, conditional | Explicit resort property/category; suitability and price require a dated offer.                                   |
| Scenic views      | Derived             | Viewpoint evidence direct; scenic quality remains subjective.                                                     |
| Pool days         | Derived             | Pool plus guest/public access and relevant opening; a private pool nearby is insufficient.                        |
| Historic sites    | Direct, conditional | Explicit historic feature/class, restricted to visitor-relevant types; age alone insufficient.                    |
| Walking tours     | Direct, conditional | Explicit tour operator/product; walkable paths do not establish tours.                                            |
| Old towns         | Derived             | Explicit historic district/entity and identity; generic historic POIs do not establish an old town.               |
| Local culture     | Insufficient        | Broad subjective concept requiring a narrower definition and identified experiences.                              |

The tag families above support the general existence mappings. More specialised mappings require a separate category/tag contract and response check before implementation. Hiking routes have their own mapping convention; spa explicitly has no single consistent tag and `leisure=spa` is deprecated as ambiguous. Historic features also have their own taxonomy. [Hiking routes](https://wiki.openstreetmap.org/wiki/Tag:route=hiking), [spa mapping](https://wiki.openstreetmap.org/wiki/Spa), [historic features](https://wiki.openstreetmap.org/wiki/Key:historic)

## Eight trip types

These labels are product interpretations, not provider facts. The following are possible evidential bases, not established classification rules.

| Trip type         | Possible basis                                                | Main missing proof                                                      |
| ----------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Baecation         | Restaurants, viewpoints, spa/stay options                     | Romantic atmosphere and couple suitability.                             |
| City break        | Museum/market/retail evidence clustered in an identified city | Walkability, travel burden and suitability for the selected duration.   |
| Beach holiday     | Accessible beaches and appropriate accommodation              | Date-specific weather, safe bathing, transfer/access practicality.      |
| Adventure         | Hiking routes, waterfalls, protected nature                   | Difficulty, season, transport/access and user capability.               |
| Foodie trip       | Food markets, cuisine evidence, explicit tours/classes        | Culinary quality, breadth and genuinely local character.                |
| Nightlife         | Bars, clubs and music venues                                  | Programme on trip dates, atmosphere and opening reliability.            |
| Relaxing escape   | Spa/resort/beach options                                      | Calmness, crowds and noise; facility existence cannot prove relaxation. |
| Culture & history | Museums, visitor-relevant historic sites, explicit tours      | Depth, diversity and availability of experiences.                       |

A place may offer evidence for several styles. Avoid granting full trip-style points because one related POI exists. Any classification rule needs examples, counterexamples and an explanation the traveller can understand.

## Spatial and coverage checks

Proposed investigation controls:

- Resolve the destination entity, country and destination coordinates separately from its serving airport. The flight feasibility sample already includes islands/countries as well as cities. Nearest airport is not a city identity, and airport-centred enrichment can collect irrelevant terminal restaurants or miss the destination entirely.
- For the same destination, compare a small central radius against a wider area. A radius is an experiment parameter, not a proven visitor catchment. Beaches, trails and waterfalls need different reachability assumptions from city museums.
- Keep query geometry and category in the evidence record. A large radius can absorb neighbouring destinations; a small one can falsely underrepresent nature experiences. Straight-line distance is not walking/driving time.
- Deduplicate OSM nodes/areas and repeated provider place IDs before counting. Counts depend on mapping detail, city size, search ranking, language, truncation and boundaries. Do not rank raw POI totals as destination quality.
- An empty, truncated, failed or throttled response must never mean “this destination has no museums/beaches”. Likewise, result membership does not prove open access on the requested dates. Check access/opening where available and state what remains unverified.

These controls are proposed implications of the source contracts, not measured coverage findings.

## Proposed first proof and unknown policy

Test **museums, beaches, bars, clubs, markets and historic sites** across a few flight-discovered destinations, including a small place and a coastal/inland contrast. This is a proof subset, not a proposal to remove other user preferences. For each signal retain named examples, stable source IDs, source category, destination association, coordinates, query boundary and retrieval time. Category-specific historical-site filtering and market semantics need review. Test hiking/nature separately once reachability is defined.

Use one bounded OSM query per sample place to inspect multiple direct categories where practical. Use a small number of Maps category searches only for explicit comparison, not every activity for every discovered city. Wikidata can help resolve identity but should not be treated as a complete POI index. Provider choice and sustainable hosting/storage permissions remain open.

Proposed outcomes per requested preference:

- **Supported:** positive source evidence for the explicitly defined claim, with examples and limitations.
- **Contradicted:** explicit evidence against a claim (for example, access prohibited for a specific activity/site), not merely no result.
- **Unknown:** missing/ambiguous source data, subjective label without a rule, failure, incomplete query or geography uncertainty.

Track evidence coverage separately from preference fit. Do not silently drop unknown requested activities from the denominator: that can make one known match look perfect. Also do not score unknown as confirmed mismatch. Options include showing supported matches and coverage together, or separating partially assessed candidates; select the ranking policy with the user before implementation.

## Current scorer implications

`src/features/destination-matching/lib/scoreDestination.ts` currently awards 25 budget, 20 month, 25 trip-type, 20 activity and 10 duration points. Activities use exact case-insensitive string membership, and trip types use array membership. The current model cannot distinguish unsupported, unknown and confirmed mismatch; feeding incomplete enrichment into these arrays would silently penalise missing evidence.

Proposed changes to discuss, not implement here:

1. Add an evidence assessment boundary before scoring, retaining provenance and unknown reasons rather than generating complete-looking `Destination` records.
2. Define explicit category-to-preference mappings and distinguish direct observations from derived trip-style rules.
3. Revisit score/display semantics for partial evidence; do not present the old percentage as equally complete across all candidates.
4. Replace static budget scoring with validated trip-cost components in its separate milestone, keeping affordability eligibility visible regardless of preference score.
5. Leave “best month” and “recommended duration” unknown unless separately sourced or explicitly defined as labelled heuristics. Dated flight prices and POI counts do not establish them.
6. Build explanations from evidence: “Museum evidence found near the city centre” is defensible; “perfect cultural holiday” is not established by the same result.

This investigation supports proceeding with a limited evidence proof. It does not pass the full automatic preference taxonomy gate or select the final architecture.
