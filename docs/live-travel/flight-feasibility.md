# External travel data feasibility

**Historical experiment only.** On 20 October 2026 SerpApi was rejected for production because its 250-search monthly free allowance is inadequate. These successful samples do not approve that provider's economics. Free-only production access is unresolved; see [the updated review](production-provider-review.md).

Status: initial authenticated checks completed on 18 October 2026 (Europe/London). Eight search requests succeeded. Overall outcome: partial; discovery and pricing look viable, complete automated preference matching is not established. Do not record keys or raw credential-bearing request URLs in this report.

## Question

Can external data support broader destination discovery, meaningful preference matching and transparent group holiday estimates within a tightly bounded free allowance?

This is a data investigation, not a replacement of the current recommendation flow. The agreed product direction is in [the roadmap](spec.md).

## Sample requests

Use Europe as the discovery region, GBP and economy. Initially test one adult so the source's price basis can be established before comparing group requests. Keep any comparative requests identical except for the dimension under test.

| Case                | Departure       | Outbound / return   | Purpose                                                                                                                                     |
| ------------------- | --------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Short break         | London Heathrow | 10–14 November 2026 | Discovery with exact dates                                                                                                                  |
| Different departure | Manchester      | 10–14 November 2026 | Establish departure affects available routes/prices                                                                                         |
| Longer stay         | London Heathrow | 10–20 November 2026 | Check date retention and accommodation stay totals                                                                                          |
| Different season    | Edinburgh       | 13–18 April 2027    | Broader route/date sample                                                                                                                   |
| Group comparison    | London Heathrow | 10–14 November 2026 | Repeat short break for two adults; determine whether the provider supports this and whether returned amounts are per person or group totals |

Recheck that dates are still future dates before running. Unsupported group parameters are a finding, not permission to silently multiply a one-adult search and label it a group quote.

Start with one discovery request. Inspect it before issuing further requests. Cap the initial exercise at 20 external searches across all engines; do not automatically paginate, fan out across destinations or retry. Stop sooner if the account's remaining allowance is lower. No paid requests or subscription changes are authorised.

## Evidence to collect

- Whether account access and responses work outside documentation examples.
- Candidate destinations beyond the existing catalogue, source IDs, coordinates and usable onward links.
- Whether requested dates, region, currency and traveller assumptions survive in results.
- Price basis, check time, source cache age where available and missing fields. A fresh retrieval is not a guarantee of fresh underlying airline inventory.
- For a small subset, dated accommodation totals, tax/fee information, occupancy and room basis. Never substitute an undefined headline hotel price for a stay total.
- For existing and new destinations, evidence supporting requested activities or trip styles. Identify explicit facts, derived rules and unknowns separately. Record how any supplemental source could be accessed and used; public examples do not prove sustainable production access.
- Actual request consumption and response times, recorded without secrets.
- Permitted storage/display and cache behaviour; document uncertainty rather than assuming unlimited reuse.

## Pass criteria and outcomes

Discovery must return useful, identifiable destinations for exact dates with interpretable flight price data and onward links. Accommodation data must have a defensible stay/occupancy basis before being combined with flight prices. Preference matching must have enough sourced evidence to distinguish some requested interests for newly discovered places; price-only results do not pass the combined product requirement.

Record pass, partial or fail for each capability, with actual observations. A flight-only success may justify an intermediate integration but does not prove the intended product is feasible. Missing activity evidence, unsupported passenger counts or uncertain price meaning must remain explicit. The exercise can identify a need for another provider or revised scope.

Before application implementation, review the findings with the user, propose the architecture and learning-critical sections, and settle remaining budget, occupancy, evidence and failure-handling rules.

## Results

The user supplied a key in the ignored local environment file. Temporary inspection scripts read it without printing it; only selected response summaries were retained in temporary storage. No application behaviour, dependencies or database data changed. An initial local script-import error and a sandbox DNS failure occurred before provider access; neither produced a provider response. The eight subsequent searches all returned HTTP 200 and provider status Success. No pagination or automatic retries were used. Actual account credit consumption was not independently checked; eight successful requests are not a verified billing statement.

| Search                                         | Candidates / properties | Candidates explicitly matching both dates | Observed response time |
| ---------------------------------------------- | ----------------------- | ----------------------------------------- | ---------------------- |
| Heathrow, 10–14 November, default one adult    | 75 destinations         | 55                                        | 10.1 s                 |
| Manchester, same dates/default passenger count | 75 destinations         | 55                                        | 3.3 s                  |
| Heathrow, same dates, two adults               | 75 destinations         | 55                                        | 8.0 s                  |
| Heathrow, 10–20 November                       | 76 destinations         | 56                                        | 3.5 s                  |
| Edinburgh, 13–18 April 2027                    | 70 destinations         | 53                                        | 9.1 s                  |
| Heathrow, 10–14 November, museums interest     | 68 destinations         | 50                                        | 15.9 s                 |
| Paris accommodation, 10–14 November, one adult | 20 properties           | Not applicable                            | 4.0 s                  |
| Paris accommodation, same dates, two adults    | 20 properties           | Not applicable                            | 3.1 s                  |

Flight searches used GBP, round-trip type and the provider's Europe region. Hotel searches also used GBP and explicitly supplied adult counts. November dates are in 2026. Provider timestamps were 17 October UTC, which was already 18 October in London.

### Discovery and dates: partial pass

Results contain identifiable places, coordinates, airport information where available and Google onward-link hosts. Changing departure changed prices and ordering: Lisbon was £150 from Heathrow versus £46 from Manchester for the same dates/default one-adult search. These are observations from one sample run, not lasting prices or guaranteed available bookings.

The later discovery summaries show that candidates not explicitly matching both dates had missing date fields, rather than conflicting dates. All candidates with both dates in those summaries matched the request. The first Heathrow summary retained only twelve individual candidates, so its twenty other undated/nonmatching entries were not inspected individually. An application must require matching dates and valid flight data before presenting an option as priced for the requested trip. The museum sample included Aix-en-Provence with dates but no flight price: dates alone are insufficient.

The Europe region also returned domestic destinations, countries/islands such as Malta, and places outside a simple EU-country list. A provider region is not a settled WhereNext coverage policy, and a destination is not necessarily identical to its serving airport. Some routes had long connections: Heathrow–Athens showed 740 minutes and one stop. Coverage, entity type and travel-burden rules still need product decisions.

### Passenger pricing: promising, basis still needs confirmation

The two-adult parameter was echoed by the provider and changed returned prices. Lisbon changed from £150 to £299; Dublin from £100 to £200; Athens from £175 to £376. This strongly suggests passenger-sensitive combined amounts, but the numeric field alone does not establish every inclusion or guarantee a group quote. Preserve the requested passenger count, confirm the basis against onward results before production use, and never multiply a possible group amount again. Carry-on baggage, hold baggage, seat fees and itinerary completeness were not verified.

### Accommodation: partial pass

Both searches echoed dates, GBP and the requested adult count. Properties included separate nightly and stay totals, property identifiers and link presence. For example, the two-adult search returned ibis budget Paris Porte de Bercy at £50 displayed nightly and £199 for four nights. The rounding difference shows why the stay total should be used directly rather than multiplying rounded nightly prices.

These are property search observations, not a representative destination-wide accommodation estimate. The one-adult results included hostel-branded properties; the summaries do not establish private room versus dormitory bed. The sampled rate objects lacked explicit pre-tax/fee breakdowns. Exact room configuration, all payable taxes, suitability, link-out date/occupancy retention and actual availability were not verified. Do not present the lowest listed price as a suitable hotel stay or multiply a group stay amount by travellers without confirming its basis.

### Preference matching: partial evidence only

The museums request echoed the requested interest and changed the destination list from 75 to 68 candidates. This establishes that an upstream interest filter affects discovery. It does not establish the quality of individual museums or a complete set of destination activity tags. Explore returned no activity/style/best-month/recommended-duration fields in these samples. No hotel-price field was returned by the sampled Explore responses either.

An interest-filter result can be recorded as source-backed candidate evidence, with unknown dimensions left unknown. It cannot replace every existing scoring category. Supplementary enrichment quality has not been tested through authenticated or live structured-data extraction in this exercise. Full automated preference matching remains an open feasibility item; the combined product gate has not passed.

### Operational limits and next decisions

Observed single-request times ranged from 3.1 to 15.9 seconds. This is not a load or reliability benchmark. A production flow must bound destination fan-out and show progress; calling several interests and hotels for every candidate would quickly spend the free allowance. Cache behaviour, quota exhaustion, provider failures and concurrent application usage were not exercised. Source storage/display permissions and image reuse were not established by a successful response.

Before application implementation:

1. Review these observations with the user, especially price basis, missing fields and matching coverage.
2. Resolve acceptable accommodation/room assumptions, dated/priced candidate eligibility and travel burden.
3. Prove supplemental preference evidence for existing and new places; do not claim that the whole matching system is solved by Explore.
4. Propose a small server-side provider boundary and explain validation, secret handling, usage limits and learning-critical sections before code changes.

Documentation research is available in [flight APIs](data-sources.md) and [destination enrichment](data-sources.md). These observations are the primary evidence for this run; no credentials, raw provider payloads or credential-bearing URLs are included in this report.
