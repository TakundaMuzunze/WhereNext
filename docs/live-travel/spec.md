# Recommend affordable holidays using external travel data and preference evidence

## Problem Statement

WhereNext helps travellers discover places, but its recommendations currently come from twelve locally authored records. Departure does not affect results, costs do not respond to travel dates or trip length, and suitability depends on manually maintained tags. Travellers cannot use those results to judge realistic options from their airport and budget. Expanding the catalogue by hand would preserve the maintenance burden and much of the same limitation.

The developer also needs a clear implementation sequence that separates research findings, product decisions and delivery while preserving practical backend, database and recommendation-engine learning.

## Solution

Help travellers discover European destinations from UK departure airports for exact dates, compare indicative group holiday costs and understand how each place fits their interests. Combine externally retrieved flight and accommodation search prices with an editable daily spending allowance. Explain supported preferences, contradictory evidence and information that could not be assessed, rather than implying certainty through the current match percentage.

Deliver this through small working increments. Flight-only previews are intermediate delivery states, not the finished product promise. The completed experience combines affordability and preference fit, supports destinations beyond the local catalogue, and preserves private shortlists.

## User Stories

1. As a traveller, I want to choose a supported UK departure airport, so that recommendations reflect where I can actually leave from.
2. As a traveller, I want to enter exact outbound and return dates, so that prices correspond to my intended trip.
3. As a traveller, I want invalid or unsupported trip inputs explained before a search, so that I can correct them without wasting requests.
4. As a traveller, I want trip duration derived consistently from my dates, so that I do not enter contradictory dates and lengths.
5. As a traveller, I want to specify the adult party size, so that retrieved prices reflect the people travelling.
6. As a traveller, I want to enter a total group holiday budget in GBP, so that I can compare options on a consistent basis.
7. As a traveller, I want to set a daily spending allowance per person, so that meals, local transport and activities contribute transparently to my estimate.
8. As a traveller, I want to select structured interests and trip preferences, so that recommendations consider what I want to do.
9. As a traveller, I want to edit my answers without losing other choices, so that I can explore alternatives easily.
10. As a traveller, I want my trip context retained through results, details and sign-in, so that navigation does not undo my planning.
11. As a traveller, I want destinations beyond the existing catalogue, so that I can discover a broader range of holidays.
12. As a traveller, I want changing departure or dates to change relevant travel options, so that my inputs have a meaningful effect.
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
24. As a traveller, I want within-budget options prioritised, so that affordability is not hidden by a strong preference score.
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

## Implementation Decisions

- Preserve the product outcome of affordability plus preference matching, not the frontend-era scoring formula, weights or exact activity taxonomy. Initially use equally important soft preferences; must-have controls and priority weighting are deferred.
- Keep the existing feature-oriented architecture. The planner owns trip input and navigation; destination matching owns assessment and recommendation orchestration; destination identity and private shortlist membership remain separate concepts. Avoid a generic provider framework or new dependency without a demonstrated need.
- Separate discovered candidates from fully authored destination guides. Do not invent guide text, activity tags, best months or ideal stay lengths to satisfy the old destination contract.
- Evolve the existing pure evaluation interface to assess normalised candidate data, cost components and preference evidence. Provider adapters validate external responses and translate them into domain data; scoring does not perform network or database writes.
- Use exact dates, UK departure airports, European destinations, adults in economy and GBP for the initial scope. Derive duration from dates and document spending days versus accommodation nights. Exact supported airports/countries and practical party limits must be settled before exposing unsupported choices.
- SerpApi is the first implementation candidate, based on successful feasibility calls, not a guaranteed final provider. Check usable production access and permitted display/storage for each adopted source. Free allowances and strict application limits come first; paid plans, automatic renewal and unlimited usage are not authorised.
- Retrieve data on the server, protect credentials and validate all client and provider inputs. Bound fan-out, retries, timeouts and pagination. Enforce usage limits before requests, including concurrent requests and all adopted search engines. Include every price-affecting parameter in reuse decisions.
- Preserve distinct retrieval times, provider times where available and uncertain upstream freshness. A recent fetch is not a guarantee of fresh airline inventory or bookability. Do not silently substitute static estimates as current prices.
- Treat flight amounts according to verified passenger basis and accommodation amounts according to verified stay/occupancy basis. Do not multiply amounts already covering the group. Combine only compatible currencies, dates and party assumptions using consistent monetary arithmetic.
- Display indicative flight, stay and local-spending components separately. Agree room allocation, property suitability, fee treatment and spending-day rules before implementing whole-holiday totals. Missing required components produce an incomplete estimate; assumptions and possible omissions remain visible.
- Present within-budget options first. Separate slightly over-budget alternatives and show the excess; define the threshold and incomplete-cost placement with the user in the relevant delivery slice rather than inventing a policy here.
- Obtain evidence for places beyond the existing catalogue automatically. Keep named examples, source identities, categories, geography and timestamps. Distinguish observations from derived claims and evidence coverage from preference fit.
- Assess supported, contradicted and unknown outcomes explicitly. Empty results, truncated queries, provider failures or absent tags do not establish a contradiction. A specific closed venue does not prove the entire destination lacks the requested activity.
- Define mappings and any trip-style inference rules before using them. Use representative examples and counterexamples. Broad categories, raw POI totals, review counts and unsupported atmosphere claims are not interchangeable with suitability.
- Replace misleading match percentages with concrete supported interests, limitations and coverage. Deterministic ranking examples, contradiction treatment and tie-breakers remain user-reviewed decisions before ranking implementation.
- Keep stable application destination identities separate from provider identifiers. Preserve existing destination URLs and shortlist references; prevent duplicates when external discovery finds an existing place. New destination details must remain useful without a fabricated full guide.
- Extend existing shortlist ownership, validation, confirmation and sign-in continuation to discovered destinations. Persist durable place identity where needed; do not turn shortlist membership into a promise to preserve a flight offer or holiday quote.
- Stage the new experience additively and keep existing journeys working until cutover is verified. Any necessary prefactoring belongs at the start of the slice that needs it and must keep the app green; no speculative rewrite is required.
- Preserve user-led learning checkpoints: explain and review the evidence types and first assessment, provider response validation, destination identity/model changes and first persistence operation before advancing. Evidence modelling is part of the preference-evidence delivery slice, not a standalone delivery milestone or an authorisation to bypass learning checkpoints.

## Testing Decisions

- Primary test seam: existing browser planner → results → details → shortlist journeys. Follow existing application-request fixture patterns for visible behaviour; verify server-side search orchestration separately with representative, sanitised external HTTP fixtures through its application request interface. Browser request interception cannot replace a provider call made by the server. Verify visible explanations, dates, group amounts, navigation, retry and saving rather than component internals or provider SDK calls.
- Persistence test seam: existing authenticated shortlist/destination handler interfaces against disposable PostgreSQL, with controlled authentication as current tests do. Verify durable identity, duplicate reconciliation, preserved old IDs, ownership, rollback and concurrent changes through responses and stored outcomes. Browser mocks alone do not prove persistence.
- Reuse the existing pure recommendation interface for focused assessment tests where browser tests would obscure arithmetic, unknown/contradicted distinctions and deterministic ordering. Avoid introducing a separate mock seam for every helper or asserting internal ORM call shapes.
- Extend existing planner serialisation/validation and sign-in continuation prior art. Preserve edited answers, query context, private-state isolation and mobile usability.
- Fixture cases must include missing dates/prices, passenger-sensitive group prices, nightly versus stay totals, unsupported categories, stale/closed places, remote POIs, inland beaches, non-food markets, partial evidence and wrong currency/occupancy. Do not make every fixture complete and successful.
- Test quota reservation under concurrency, bounded retries, reuse-key separation, malformed upstream data and exhausted allowances through observable outcomes. Prove no uncontrolled requests or paid fallback occur.
- Use optional bounded live smoke checks to verify actual provider access and field meaning. Keep secrets and raw credential-bearing URLs out of fixtures, logs and issues; do not spend real credits during normal CI.
- Run type checking, relevant tests and diff review in each slice, not only at the end. Final rollout additionally verifies the production build, browser journeys and isolated database/migration guarantees. Record known environmental or provider limitations explicitly.
- The testing approach and eight-ticket breakdown were reviewed and accepted before publication.

## Out of Scope

Booking or payment, guaranteed package quotes, child/infant or premium-cabin support, worldwide launch scope, unlimited free search, automatic paid upgrades, hand-curating a fixed fifty-destination catalogue as the new product foundation, a private content-management interface, and preserving the old 100-point formula as a constraint.

Free-text preferences remain an agreed later direction after evidenced structured matching works. Model/provider selection, grounded interpretation and evaluation for that feature need a follow-up spec; they are not silently bundled into this first release. Recommendation snapshots, saved itineraries, collaborative shortlists and general account redesign are also excluded.

## Further Notes

Initial flight, hotel and place-evidence requests succeeded, including destinations outside the catalogue. Eleven successful SerpApi requests have been made across feasibility work; actual billed consumption was not independently checked. These findings establish useful data availability, not complete preference coverage, verified room/fee assumptions or production reliability.

Do not restart research from zero, but do not claim unresolved matters are settled. Room policy, the exact slightly-over-budget threshold, inference/ranking rules, supported geography, permissions and production usage limits must be resolved at the relevant implementation checkpoint.

## Delivery tracking

GitHub issues are the source of truth for delivery scope, acceptance criteria, dependencies and status. This document is the source of truth for the feature specification; supporting reports record dated research observations rather than additional requirements. Do not keep local copies of ticket bodies.

Use the ready-to-build status label and respect blocking edges and user-led learning checkpoints. Publication does not authorise paid access, bypass checkpoints or start implementation automatically. Existing completed shortlist issues remain unchanged.
