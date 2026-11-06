# Initial seasonal guidance

Reviewed with the user on 6 November 2026. This branch combines source evidence, persistence, interpretation and the visible feature; no separate research merge is required. The canonical specification remains `spec.md`; GitHub #48 owns source validation and #42 owns recommendation delivery.

## Source and actual checks

The selected first source is NASA POWER's Climatology API using MERRA-2 meteorology. Requests explicitly select `T2M` and `PRECTOTCORR`, community `AG`, and the fixed 1991–2020 baseline. Live checks returned all twelve months for Lisbon, Porto, Seville and Chamonix. The default response instead covered 2001–2025 at research time, so the implementation validates the returned period rather than trusting defaults. Stored fixtures include actual additional requests at the Lisbon and Chamonix source-grid centres.

- [Climatology API](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/)
- [Meteorology methodology and native grid](https://power.larc.nasa.gov/docs/methodology/meteorology/)
- [Data meaning, resolution and terrain limitations](https://power.larc.nasa.gov/docs/faqs/data/)

`T2M` is mean air temperature at two metres, including day and night, in °C. It is not the typical daytime high. `PRECTOTCORR` is mean precipitation in mm/day, not precipitation probability, rainy-day count, or a forecast. Air temperature does not establish sea temperature. Missing values (`-999`, null or absent month values) stay unknown; malformed envelopes, changed units/baselines and mismatched coordinates reject the response. Unverified maximum/minimum aggregation semantics are deliberately excluded.

MERRA-2 meteorology uses a 0.5° latitude × 0.625° longitude grid. The lookup uses the nearest source-grid centre and keys reuse by source/model, baseline, interpretation version and coordinates. Nearby catalogue destinations share one cell. This supports regional background, with potentially substantial coastal and mountain differences. The returned regional model elevation is retained and displayed, not treated as destination elevation or evidence of access.

NASA's [POWER usage statement](https://forum.earthdata.nasa.gov/viewtopic.php?p=635) permits public-domain data use, including commercial applications without fees. Its [current referencing guide](https://power.larc.nasa.gov/docs/referencing/) requests POWER acknowledgement, service/version and access date. The detail view includes these; there is no implication of NASA endorsement. The [NASA Science Data licensing guidance](https://science.data.nasa.gov/about/license) distinguishes NASA-produced data from third-party restricted content. No restricted imagery or guide prose is copied.

## Agreed product preferences

The first preference bands are product choices reviewed with the user, not NASA-defined scientific suitability or safety thresholds:

| Requested interests                                        | Climate preference               | Monthly mean air temperature | Mean precipitation           |
| ---------------------------------------------------------- | -------------------------------- | ---------------------------- | ---------------------------- |
| Beaches                                                    | Warmer/drier beach climate       | 18–26°C inclusive            | Up to 2 mm/day inclusive     |
| Walking tours, Architecture, Historic sites, Old towns     | Milder/drier outdoor sightseeing | 12–22°C inclusive            | Up to 2 mm/day inclusive     |
| Other interests, including museums, nightlife and swimming | Climate context only             | No preference classification | No preference classification |

Interests in the same climate group count once. A complete month is labelled within preference bands or as having climate trade-offs. Missing temperature or precipitation leaves that preference unknown. These rules do not establish that an activity exists: activity evidence, beach access, safe swimming, hiking, opening dates, crowds and closures remain separate.

- A preferred month selects that calendar month from the baseline. The requested year remains in trip context; it does not transform the climate average into a forecast.
- Exact dates show every calendar month touched, including across December/January. A preference matches the whole trip only when every touched month is within its bands; an observed trade-off remains visible. No fake daily forecast or duration-weighted weather precision is derived from monthly averages.
- Flexible timing lists months within all requested climate groups. Ranking compares the best available monthly preference outcome, not raw counts of favourable months. Unsupported interests get monthly context without suggested best periods.
- Results default to destinations meeting every selected climate preference: one complete matching month for flexible timing, or every month touched for chosen dates. Climate trade-offs and unverified seasonal fit have separate selectable views with independent pagination context. Unknown evidence is not a mismatch. Interests without a climate rule are not filtered.
- Within each view, ranking first compares activity support and explicit activity conflicts, then climate preference matches and trade-offs, then destination name/ID. It does not exclude unknown places, use raw POI counts or claim a combined percentage score.

## Storage and failure behaviour

The additive `SeasonalClimate` table stores one validated observation per source-grid request key, with its retrieval timestamp. Reads require the supported baseline/schema, exact geometry/key/timestamp agreement, no future timestamp and a retrieval age under 365 days. That year is an operational review policy for the fixed historical baseline, not a claim that history changes daily. Old snapshots remain stored but do not support ranking after the review period.

Results batch-read stored cells. Details reuse the verified catalogue/legacy geography resolver, never an airport. Missing migration, storage failure, missing evidence, expired review or ambiguous legacy geography gives explicit seasonal unknowns while preserving discovery and saving. No NASA requests occur on traveller searches or detail loads.

## Rollout and enrichment

After reviewing the additive migration, apply it to the intended database with the existing migration deployment process:

```bash
npx prisma migrate deploy
npm run destinations:climate -- --limit 5
npm run destinations:climate -- --all-batches --apply
```

The enrichment command reads `DATABASE_URL` from the existing environment. Preview is read-only and makes bounded source requests for uncached cells. It defaults to 25 destinations, accepts 1–50 per page and reports progress, source fetches, reuse, remaining coverage and a resume cursor. `--all-batches` traverses the starting catalogue snapshot sequentially, without manual cursor pasting. Preview and apply both reuse valid stored cells and deduplicate cells within a run. Different operator runs should not overlap; no scheduler or cross-process source lock is introduced in this slice.

Source requests are sequential, pause one second between new cells, have a 30-second timeout and no automatic retries. Failures stop with a resume cursor; earlier atomic cell writes remain intact. An invalid response never replaces the previous cell. NASA [request guidance](https://power.larc.nasa.gov/docs/tutorials/service-data-request/api/) asks callers not to exceed native resolution or five concurrent requests, and warns that abusive access can be blocked. No guaranteed daily entitlement or uptime is assumed. With durable reuse, growth in traveller searches does not multiply NASA calls; enrichment volume depends on distinct new or annually reviewed grid cells. This is a bounded design, not a production-load benchmark.

After a year, rerunning enrichment refreshes cells that need review. No new credentials, API key, account, paid plan or automatic schedule is required. The migration and real enrichment have not been applied to a hosted database as part of implementation. Production coverage remains unknown until rollout is verified.

## Verification

Public assessment tests cover experience groups, flexible/month/exact timing, cross-year trips, missing evidence and preference trade-offs. Source tests use recorded NASA fixtures; CI does not call NASA. Disposable PostgreSQL tests cover persistence, reuse, malformed/stale/future/mismatched records, missing migration, preview/apply, bounded pagination and failed-source resume. Browser journeys cover results/details, original request context, mobile layout and saving independently of evidence. Synthetic browser climate values are test fixtures, not destination claims.
