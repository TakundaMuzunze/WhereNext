# Discover suitable destinations, then check travel costs

## Product direction — agreed 20 October 2026

The journey is destination-first: discover places suited to the traveller, explore activities and seasonal trade-offs, then choose destinations and dates for travel-cost checking. Discovery may show **budget fit unknown**. Missing cost data must not exclude a destination or imply affordability.

This direction supersedes the exact-date-first discovery requirements in the earlier specification. Existing dated functionality remains reusable implementation work, not the definition of the intended journey.

## User journey

1. **Discover:** collect structured interests, approximate duration, party size and total group budget in GBP. Timing supports flexible travel, a preferred month or exact dates. Exact dates and a departure airport are not prerequisites for discovering destinations. Preserve any details supplied early for later checks.
2. **Explore and compare:** explain why each destination is worth considering, show named activity evidence, seasonal guidance where supported, and explicit unknowns. Allow destinations to be saved before travel costs are known. A missing cached fare must not remove a suitable destination.
3. **Check travel costs:** for a chosen destination, collect or confirm exact dates, supported departure airport, adult party size and spending assumptions. Present flight, accommodation and spending components separately. Incomplete costs remain incomplete; onward searches allow the traveller to continue checking.

### Timing behaviour

- **Flexible:** show suitable periods for the requested experiences only where evidence supports them. Do not choose arbitrary travel dates to run flight searches.
- **Preferred month:** explain suitability and trade-offs for that month. Missing seasonal evidence is unknown, not a poor match.
- **Exact dates:** retain the dates and derive trip duration consistently. Destination discovery remains independent of flight-cache coverage; activity existence does not establish opening or availability on those dates.

### Budget and evidence behaviour

Budget is planning context from discovery onwards. Unknown budget fit is an acceptable first-release outcome and does not block discovery. Show sourced planning ranges only when their basis, scope and age are established; supplying such ranges is not a first-release prerequisite. Do not use invented cost-of-living figures, cheap airfare or missing accommodation costs to claim a destination fits the group budget.

Seasonal suitability means suitability for the traveller's intended experiences. A beach trip and museum trip can favour different periods. Climate observations, forecasts, seasonal access and crowd claims have different meanings; none alone establishes a universal “best month”. Display the basis and limitations of any recommendation.

## Existing implementation — preserved, not the target journey

The dated results page currently offers an explicit search using Travelpayouts cached exact-date flight estimates, GeoNames geography and Geoapify activity evidence. It selects up to four cheap fare-backed destinations in France, Spain, Portugal, Italy, Greece and Malta, then gathers limited activity evidence. This reverses the intended destination-first selection order.

Group flights multiply cached ticket prices by adults and remain estimates. Remaining budget excludes accommodation. External destinations are not yet saveable. Seasonal suitability is not implemented. See [discovery implementation](discovery-implementation.md) for delivered behaviour, limits and previous validation.

Reuse dated input validation, URL context, provider response validation, request reservations and cost arithmetic where appropriate. The existing fare-led orchestration needs adapting for destination-specific travel checks; it cannot be relabelled as the redesigned experience.

## Problem Statement

WhereNext helps travellers discover places, but its recommendations currently come from twelve locally authored records. Departure does not affect results, costs do not respond to travel dates or trip length, and suitability depends on manually maintained tags. Travellers cannot use those results to judge realistic options from their airport and budget. Expanding the catalogue by hand would preserve the maintenance burden and much of the same limitation.

The developer also needs a clear implementation sequence that separates research findings, product decisions and delivery while preserving practical backend, database and recommendation-engine learning.

## Solution

Help travellers discover European destinations through evidenced preference fit and seasonal guidance, then assess travel costs for places they choose. Preserve private shortlists and useful context across the journey. Keep suitability, evidence coverage and budget fit distinct, with unknown information visible.

Deliver in small working increments with zero ongoing API spend. External destination selection and seasonal evidence require proven sources before provider-dependent implementation; existing geography and POI lookups do not establish those capabilities. Unknown affordability is supported without waiting for a hotel-price integration.

## User Stories

1. As a traveller, I want to choose a supported UK departure airport when checking travel costs, so that estimates reflect where I can leave from.
2. As a traveller, I want to discover with flexible timing, a preferred month or exact dates, so that I can explore before committing to dates.
3. As a traveller, I want invalid or unsupported trip inputs explained before a search, so that I can correct them without wasting requests.
4. As a traveller, I want trip duration derived consistently from my dates, so that I do not enter contradictory dates and lengths.
5. As a traveller, I want to specify the adult party size, so that retrieved prices reflect the people travelling.
6. As a traveller, I want to enter a total group holiday budget in GBP, so that I can compare options on a consistent basis.
7. As a traveller, I want to set a daily spending allowance per person, so that meals, local transport and activities contribute transparently to my estimate.
8. As a traveller, I want to select structured interests and trip preferences, so that recommendations consider what I want to do.
9. As a traveller, I want to edit my answers without losing other choices, so that I can explore alternatives easily.
10. As a traveller, I want my trip context retained through results, details and sign-in, so that navigation does not undo my planning.
11. As a traveller, I want destinations beyond the existing catalogue, so that I can discover a broader range of holidays.
12. As a traveller, I want timing to inform evidenced suitability and departure/dates to inform later travel checks, without missing fares hiding destinations.
13. As a traveller, I want prices tied to the requested dates and party assumptions, so that unrelated offers do not appear applicable to my trip.
14. As a traveller, I want flight duration and stops shown, so that a cheap but inconvenient route is visible as such.
15. As a traveller, I want to distinguish a destination from its serving airport, so that I understand where I am considering staying.
16. As a traveller, I want onward search links, so that I can inspect the source options and continue planning.
17. As a traveller, I want to know when prices were retrieved, so that I can judge their freshness.
18. As a traveller, I want a warning that search prices can change, so that I do not mistake them for guaranteed bookings.
19. As a traveller, I want accommodation searched for my stay dates and party assumptions, so that the stay estimate is relevant.
20. As a traveller, I want room and accommodation assumptions explained, so that a bed or unsuitable property is not silently treated as my hotel stay.
21. As a traveller, I want a stay total distinct from a nightly rate, so that I understand the accommodation amount being compared.
22. As a traveller, I want flights, accommodation and spending allowance shown separately, so that I can see what drives the estimate.
23. As a traveller, I want missing costs and uncertain fees identified, so that a partial amount is not presented as a complete holiday cost.
24. As a traveller, I want sufficiently priced options compared against my budget during travel-cost checking, with incomplete options clearly distinguished.
25. As a traveller, I want slightly over-budget alternatives labelled with the excess, so that I can assess a deliberate trade-off.
26. As a traveller, I want incompletely priced options distinguished from affordable options, so that missing prices are not mistaken for savings.
27. As a traveller, I want named places and clear reasons supporting a recommendation, so that I can understand its preference fit.
28. As a traveller, I want unknown preference information stated explicitly, so that missing evidence is not disguised as a match or mismatch.
29. As a traveller, I want explicit contradictory evidence distinguished from missing data, so that I can understand relevant limitations.
30. As a traveller, I want direct observations distinguished from inferred trip styles, so that I understand the basis of subjective recommendations.
31. As a traveller, I want place categories interpreted accurately, so that an inland beach or generic market does not imply a seaside holiday or food market.
32. As a traveller, I want location, reachability and known closure information considered, so that irrelevant or unavailable places do not support misleading claims.
33. As a traveller, I want concrete preference findings instead of an unsupported match percentage, so that the explanation reflects the evidence available.
34. As a traveller, I want limited evidence coverage shown, so that a lightly researched option does not appear perfectly assessed.
35. As a traveller, I want useful progress and loading feedback, so that slower external searches remain understandable.
36. As a traveller, I want clear empty, partial and failed-search states, so that I know whether to change inputs, retry or return later.
37. As a traveller, I want permitted older results labelled with their age, so that cached information is not presented as newly checked.
38. As a traveller, I want an honest unavailable state when the search allowance is exhausted, so that static fallback data is not misrepresented as current.
39. As a signed-in traveller, I want to save an externally discovered destination to my shortlists, so that new discoveries fit my existing planning workflow.
40. As a returning traveller, I want old shortlist entries and destination links preserved, so that the upgrade does not lose my plans.
41. As a traveller, I want a saved destination to remain understandable after its price changes, so that a saved place is not confused with a saved booking offer.
42. As a guest, I want sign-in to resume the intended shortlist picker without automatically saving, so that the existing confirmation behaviour is preserved.
43. As a traveller, I want private shortlist data protected across users and sessions, so that external destination discovery does not weaken privacy.
44. As a mobile traveller, I want to complete the planning and comparison flow on a small screen, so that the expanded information remains usable.
45. As the project developer, I want bounded external usage and no automatic paid access, so that this portfolio project cannot silently incur charges.
46. As the project developer, I want to implement and review important domain, validation and persistence decisions, so that delivery deepens my engineering skills.
47. As a traveller, I want seasonal guidance tied to my interests and its evidence, so that I can understand when and why to visit.
48. As a traveller, I want to explore and save destinations with unknown budget fit, so that missing prices do not prevent planning.

## Implementation Decisions

- Preserve the product outcome of affordability plus preference matching, not the frontend-era scoring formula, weights or exact activity taxonomy. Initially use equally important soft preferences; must-have controls and priority weighting are deferred.
- Keep the existing feature-oriented architecture. The planner owns trip input and navigation; destination matching owns assessment and recommendation orchestration; destination identity and private shortlist membership remain separate concepts. Avoid a generic provider framework or new dependency without a demonstrated need.
- Separate discovered candidates from fully authored destination guides. Do not invent guide text, activity tags, best months or ideal stay lengths to satisfy the old destination contract.
- Evolve the existing pure evaluation interface to assess normalised candidate data, cost components and preference evidence. Provider adapters validate external responses and translate them into domain data; scoring does not perform network or database writes.
- Separate discovery context from a dated travel-cost request. Retain European destinations, UK departures for travel checks, adults in economy and GBP as the bounded starting scope. Discovery supports flexible timing and a preferred month; exact dates are required only for dated checks. Resolve supported geography and practical input limits before exposing them.
- Ongoing API spend must be zero. SerpApi is rejected as a production dependency: its 250-search monthly free allowance does not meet the intended product use. Earlier successful calls establish data feasibility only and must not be used as production-provider selection evidence. No paid plan, renewal, credit purchase or booking-linked fee arrangement is authorised.
- Production provider selection is a prerequisite to provider-dependent implementation. Verify actual access for this pre-launch project, sustained quotas, credit cost per complete planning session, allowed reuse, UK/Europe coverage, price semantics and permitted links. Evaluate flight, accommodation and destination evidence separately; do not assume one search account can economically supply everything.
- No free source has yet been verified to support live exact-date group-flight discovery plus accommodation under this project's access constraints. Travelpayouts cached discovery, GeoNames geography and Geoapify activity evidence are used by the previously authorised implementation described above, following real response tests. Cached single-traveller fares cannot be presented as fresh group quotes. Traveller-estimated accommodation is not part of this slice and still requires product agreement.
- Retrieve data on the server, protect credentials and validate all client and provider inputs. Bound fan-out, retries, timeouts and pagination. Enforce each selected provider's actual rate/credit policy before requests, including concurrent requests and all engines sharing that provider account. Application caps must prevent overuse, not disguise inadequate product capacity. Include every price-affecting parameter in reuse decisions.
- Preserve distinct retrieval times, provider times where available and uncertain upstream freshness. A recent fetch is not a guarantee of fresh airline inventory or bookability. Do not silently substitute static estimates as current prices.
- Treat flight amounts according to verified passenger basis and accommodation amounts according to verified stay/occupancy basis. Do not multiply amounts already covering the group. Combine only compatible currencies, dates and party assumptions using consistent monetary arithmetic.
- Display indicative flight, stay and local-spending components separately. Agree room allocation, property suitability, fee treatment and spending-day rules before implementing whole-holiday totals. Missing required components produce an incomplete estimate; assumptions and possible omissions remain visible.
- Discovery must not use fare availability or unknown budget fit as exclusion rules. During travel-cost comparison, distinguish sufficiently priced within-budget options, over-budget options and incomplete estimates. Define ranking and any over-budget threshold at the relevant learning checkpoint.
- Obtain evidence for places beyond the existing catalogue automatically. Keep named examples, source identities, categories, geography and timestamps. Distinguish observations from derived claims and evidence coverage from preference fit.
- Assess supported, contradicted and unknown outcomes explicitly. Empty results, truncated queries, provider failures or absent tags do not establish a contradiction. A specific closed venue does not prove the entire destination lacks the requested activity.
- Define mappings and any trip-style inference rules before using them. Use representative examples and counterexamples. Broad categories, raw POI totals, review counts and unsupported atmosphere claims are not interchangeable with suitability.
- Replace misleading match percentages with concrete supported interests, limitations and coverage. Deterministic ranking examples, contradiction treatment and tie-breakers remain user-reviewed decisions before ranking implementation.
- Keep stable application destination identities separate from provider identifiers. Preserve existing destination URLs and shortlist references; prevent duplicates when external discovery finds an existing place. New destination details must remain useful without a fabricated full guide.
- Extend existing shortlist ownership, validation, confirmation and sign-in continuation to discovered destinations. Persist durable place identity where needed; do not turn shortlist membership into a promise to preserve a flight offer or holiday quote.
- Stage the new experience additively and keep existing journeys working until cutover is verified. Any necessary prefactoring belongs at the start of the slice that needs it and must keep the app green; no speculative rewrite is required.
- Preserve user-led learning checkpoints: explain and review the evidence types and first assessment, provider response validation, destination identity/model changes and first persistence operation before advancing. Evidence modelling is part of the preference-evidence delivery slice, not a standalone delivery milestone or an authorisation to bypass learning checkpoints.

## Delivery sequence and open evidence gates

1. Establish a destination candidate source independent of fares. Prove destination identity, visitor relevance, coverage, reuse rights and bounded operation with actual responses. GeoNames geography alone is insufficient. The existing twelve records remain a legacy baseline, not the new catalogue strategy.
2. Establish seasonal evidence for a bounded set of experiences and representative destinations. Verify actual payloads, interpretation and limitations before promising best-month guidance. No seasonal provider is selected by this specification.
3. Review the discovery inputs, evidence model, ranking examples and mobile journey before implementation. Reuse existing feature boundaries; do not create a generic provider framework.
4. Deliver discovery, useful destination details and saving with stable identity. Preserve old destination links and private shortlist behaviour. Budget fit may remain unknown throughout this increment.
5. Adapt the dated slice to chosen-destination travel checks. Verify airport association and actual destination-specific response behaviour. Accommodation and complete holiday affordability remain dependent on separately proven sources.

These are sequencing decisions, not duplicate delivery tickets. Reconcile existing GitHub issue bodies and dependencies after inspecting their current state; the old eight-ticket plan is not evidence that this revised journey is already delivered or ready to build. No issue status is changed by this document.

## Testing Decisions

- Primary test seam: existing browser planner → results → details → shortlist journeys. Follow existing application-request fixture patterns for visible behaviour; verify server-side search orchestration separately with representative, sanitised external HTTP fixtures through its application request interface. Browser request interception cannot replace a provider call made by the server. Verify visible explanations, dates, group amounts, navigation, retry and saving rather than component internals or provider SDK calls.
- Persistence test seam: existing authenticated shortlist/destination handler interfaces against disposable PostgreSQL, with controlled authentication as current tests do. Verify durable identity, duplicate reconciliation, preserved old IDs, ownership, rollback and concurrent changes through responses and stored outcomes. Browser mocks alone do not prove persistence.
- Reuse the existing pure recommendation interface for focused assessment tests where browser tests would obscure arithmetic, unknown/contradicted distinctions and deterministic ordering. Avoid introducing a separate mock seam for every helper or asserting internal ORM call shapes.
- Extend existing planner serialisation/validation and sign-in continuation prior art. Preserve edited answers, query context, private-state isolation and mobile usability.
- Fixture cases must include missing dates/prices, passenger-sensitive group prices, nightly versus stay totals, unsupported categories, stale/closed places, remote POIs, inland beaches, non-food markets, partial evidence and wrong currency/occupancy. Do not make every fixture complete and successful.
- Test quota reservation under concurrency, bounded retries, reuse-key separation, malformed upstream data and exhausted allowances through observable outcomes. Prove no uncontrolled requests or paid fallback occur.
- Use optional bounded live smoke checks to verify actual provider access and field meaning. Keep secrets and raw credential-bearing URLs out of fixtures, logs and issues; do not spend real credits during normal CI.
- Run type checking, relevant tests and diff review in each slice, not only at the end. Final rollout additionally verifies the production build, browser journeys and isolated database/migration guarantees. Record known environmental or provider limitations explicitly.
- The earlier testing approach and eight-ticket breakdown were reviewed before publication for the previous scope. Delivery issues need reconciliation with this destination-first direction.
- Verify flexible/month/exact-date navigation, preserved inputs, saving before cost checks, and that missing fares or unknown costs do not remove suitable candidates. Verify unsupported seasonal claims remain unknown and seasonal explanations reflect the requested experience.

## Out of Scope

Booking or payment, guaranteed package quotes, child/infant or premium-cabin support, worldwide launch scope, unlimited free search, automatic paid upgrades, hand-curating a fixed fifty-destination catalogue as the new product foundation, a private content-management interface, and preserving the old 100-point formula as a constraint.

Free-text preferences remain an agreed later direction after evidenced structured matching works. Model/provider selection, grounded interpretation and evaluation for that feature need a follow-up spec; they are not silently bundled into this first release. Recommendation snapshots, saved itineraries, collaborative shortlists and general account redesign are also excluded.

## Further Notes

Initial flight, hotel and place-evidence requests succeeded, including destinations outside the catalogue. Eleven successful SerpApi requests were made across feasibility work; actual billed consumption was not independently checked. The production recommendation based on that exercise was withdrawn on 20 October 2026 after the user rejected the monthly allowance and confirmed free-only access. Preserve the existing dated planner and useful validation/reservation work; retain the SerpApi implementation only as an explicitly disabled production prototype.

Do not restart research from zero, but do not claim unresolved matters are settled. Room policy, the exact slightly-over-budget threshold, inference/ranking rules, supported geography, permissions and production usage limits must be resolved at the relevant implementation checkpoint.

## Delivery tracking

GitHub issues are the source of truth for delivery scope, acceptance criteria, dependencies and status. This document is the source of truth for the feature specification; supporting reports record dated research observations rather than additional requirements. Do not keep local copies of ticket bodies.

Use the ready-to-build status label and respect blocking edges and user-led learning checkpoints. Publication does not authorise paid access, bypass checkpoints or start implementation automatically. Existing completed shortlist issues remain unchanged.
