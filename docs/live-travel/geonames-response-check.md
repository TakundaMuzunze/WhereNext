# GeoNames response check

**Follow-up:** a subsequent authenticated lookup of Faro through `https://secure.geonames.org/searchJSON` succeeded with TLS verification enabled. The implementation uses that secure hostname; the earlier transport limitation below applies to `api.geonames.org`.

Tested 20 October 2026 with the configured account username. Four authenticated `searchJSON` requests returned HTTP 200 with no API error after the username was corrected. No product code changed.

All queries used `featureClass=P`, `maxRows=5`, `style=FULL`, `lang=en`. The following counts are provider-reported total matches, not returned page sizes or verified destination counts.

| Query               | Country filter | Total matches | First record              |
| ------------------- | -------------- | ------------: | ------------------------- |
| `q=Lisbon`          | PT             |          1266 | Lisbon, ID 2267057        |
| `q=Český Krumlov`   | CZ             |           439 | Český Krumlov, ID 3077889 |
| `name_equals=Paris` | None           |            77 | Paris, France, ID 2988507 |
| `name_equals=Paris` | FR             |             2 | Paris, France, ID 2988507 |

Records supplied GeoNames IDs, names, country codes, administrative regions, coordinates, feature codes, population and time zone IDs. Český Krumlov's reported population was 12,797, demonstrating coverage of a town below GeoDB's published free-tier population threshold. Population accuracy was not independently checked.

## Implications

- Suitable data has been demonstrated for destination identity and geographic context. Coordinates can connect a chosen destination to Geoapify place queries; this join has not yet been tested end to end.
- Broad text search is not an exact city lookup: the Lisbon page also contained Amadora and Queluz; the Český Krumlov page contained other settlements. Never import all search matches as equivalent destinations.
- Names are ambiguous. Unrestricted Paris returned records in France, the US, Denmark and Canada. Even country-filtered `name_equals=Paris` returned both Paris and Les Paris. Use provider IDs, country/administrative context and explicit resolution rather than assuming the first result or a name string is unique.
- The tested endpoint establishes neither tourism suitability nor activities, photos, current fares or accommodation costs. It does not establish airport-to-destination transport relationships.
- HTTPS requests to `api.geonames.org` failed certificate hostname validation in this environment. Certificate verification was not bypassed. The successful tests used the documented HTTP endpoint, transmitting only the account username and place queries. Resolve secure transport or evaluate the downloadable dataset before production use.
- This was a four-query sample, not a coverage or reliability benchmark. Attribution and current usage limits still apply.

Raw successful responses and the temporary script are outside Git at `/private/tmp/where-next-provider-check/geonames-*.json` and `geonames.py`. The script loads the username from environment files; no credentials are embedded in it.

References: [GeoNames web services](https://www.geonames.org/export/web-services.html), [licensing and limits](https://www.geonames.org/export/).
