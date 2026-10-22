# Replacement API response check

Tested 20 October 2026 using the project's configured credentials. Nine authenticated GET requests succeeded (HTTP 200): six Travelpayouts flight requests and three Geoapify Places requests. No bookings or paid plans were activated. Raw responses and the temporary probe are outside Git in `/private/tmp/where-next-provider-check`; they contain no API keys. Credentials were loaded from the ignored `.env` and were not printed.

## Flights: successful access, limited exact-date usefulness

Endpoint: `https://api.travelpayouts.com/aviasales/v3/prices_for_dates`. Parameters: `currency=gbp`, `one_way=false`, `unique=true`, `limit=100`, `sorting=price`, origin as below, no destination or explicit market. Authentication used `X-Access-Token`.

| Origin | Departure / return                             | Records | Example returned price           |
| ------ | ---------------------------------------------- | ------: | -------------------------------- |
| LHR    | 10–14 November 2026                            |       7 | Faro £142                        |
| MAN    | 10–14 November 2026                            |       0 | No cached result                 |
| LON    | 10–14 November 2026                            |       7 | Faro £40, departing STN          |
| LHR    | 4–8 December 2026                              |       4 | Helsinki £163                    |
| MAN    | 4–8 December 2026                              |       1 | Istanbul city / SAW airport £138 |
| MAN    | November 2026, both date parameters month-only |      93 | Shannon £28 for 13–15 November   |

These are returned cached ticket prices, not verified current availability or group quotes. All envelopes reported `success=true` and `currency=gbp`. Exact-date records matched the requested departure/return calendar dates. The month-only query deliberately changed the constraint for diagnosis; it must not silently replace an exact-date request in the product.

Important observations:

- Manchester access works; its empty exact-date result is a cache coverage gap, not proof of no flights. Two tested exact-date windows are too small a sample to establish general coverage.
- Heathrow requests returned Heathrow departures in this sample; London-city requests included Stansted, Gatwick and Luton. Substituting LON for LHR would change the user's airport choice. Return-airport details can also differ: the cheap London–Faro link encoded an STN departure and LTN return, while the top-level record exposed only the outbound origin airport.
- Results include destinations beyond the project's target region, including Abuja and Astana. Region and supported-country filtering are required; the headline counts are not counts of eligible recommendations.
- Responses have no explicit fare observation/expiry timestamp or passenger-count field. Links include `search_date`, ranging from 14–20 October across the samples. This is an observed link parameter, not a validated fare freshness timestamp. Do not advertise a 48-hour freshness guarantee: the observed link dates include older searches despite the endpoint documentation's 48-hour description.
- Adult count was not sent because the documented endpoint has no adult-count parameter. Group seat availability and pricing remain unverified; multiplying this fare is only an estimate.
- `duration` differs from `duration_to + duration_back` on connecting itineraries. For Heathrow–Faro the fields were 960 versus 220 + 225 minutes. Duration meanings need resolution before mapping to the existing model.
- No onward link was opened or booking price rechecked. GBP was requested and echoed; conversion accuracy was not independently tested. No explicit market was selected, so UK-market coverage remains a separate question.

**Decision:** usable authenticated cached discovery responses have been demonstrated. This fails to establish a replacement for reliable live, exact-date group pricing. Broad-month discovery appears more populated in the single Manchester comparison, but changing to flexible dates requires product agreement.

## Destination evidence: useful museum records demonstrated

Endpoint: `https://api.geoapify.com/v2/places`. Three queries used `categories=entertainment.museum`, a 4 km circle, proximity bias, and `limit=20`:

| Place         | Centre longitude, latitude | Returned records | Example               |
| ------------- | -------------------------- | ---------------: | --------------------- |
| Lisbon        | -9.1393, 38.7223           |               20 | Museu Miguel Bombarda |
| Florence      | 11.2558, 43.7696           |               20 | Galleria degli Uffizi |
| Český Krumlov | 14.3151, 48.8107           |               20 | Muzeum útrpného práva |

Each sample had 20 distinct source OSM IDs. Records supplied categories, coordinates, a provider place ID, source attribution and varying website/opening-hours fields. These are capped samples, not total museum counts. Distinct OSM IDs do not guarantee distinct real-world venues. Listing accuracy, current opening hours, other activity categories and subjective trip styles were not independently verified.

Three queries returning at most 20 records imply three Places credits under the published pricing; dashboard consumption was not checked. Free-plan Geoapify attribution and OpenStreetMap attribution/licensing still apply. Geoapify is a demonstrated museum-evidence candidate, not a complete preference-matching solution.

## Consequence

No production adapter or ranking change was made by this test. Retain the production-provider gate. Geoapify warrants broader category checks; Travelpayouts warrants adoption only if the user explicitly accepts cached indicative prices, sparse exact-date coverage and estimated group costs. Accommodation remains unresolved.

Primary references: [Travelpayouts endpoint contract](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API), [Geoapify Places](https://apidocs.geoapify.com/docs/places/), [Geoapify credit pricing](https://www.geoapify.com/pricing-details/).
