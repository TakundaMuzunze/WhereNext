# Destination images

Imported places have optional Wikimedia Commons imagery, selected through their exact Wikidata identity. Results, shortlist cards and imported details share a landscape photo component and a deliberate missing/broken-image fallback. Existing authored guide photos remain preferred where a verified guide is available. Images never affect destination ranking or determine activity, seasonal or budget evidence.

## Enrichment

Image enrichment is separate from destination imports. A source outage does not block importing places, and public page rendering never calls Wikidata or the Commons metadata API. Existing destinations can be backfilled without reimporting them. The new `DestinationImage` table stores validated metadata and its retrieval time; binary images are served from Wikimedia through Next.js image optimisation.

Apply the additive migration using the normal database deployment process before saving enrichment:

```bash
npx prisma migrate deploy
```

Preview a bounded batch from the configured database:

```bash
npm run destinations:images -- PT --limit 25
```

Review the selected photos, source links and credits, then save with:

```bash
npm run destinations:images -- PT --limit 25 --apply
```

To process every imported destination automatically:

```bash
npm run destinations:images -- ALL --all-batches --apply
```

This still works in batches of at most 25, with a two-second pause between batches. Progress goes to stderr and the final totals are JSON on stdout. The run records the starting final destination ID so imports added beyond that point do not extend it indefinitely. It stops on a source or database failure, retains completed batches and prints an exact resume command. Rerunning from the start is also safe because saves update by destination identity. Omitting `--apply` keeps the whole run read-only. This command must be run intentionally; results-page loads never start it.

Use `ES`, `FR`, `IT`, `GR`, `MT` or `ALL` to change the country selection. The limit is 1–25 existing destinations. If `nextCursor` is non-null, pass that exact value with `--cursor` for the next batch; keep the same country selection. Preview does not write. Apply publishes the next cursor only after the batch has saved. No new API key or paid service is required.

Each batch makes one Wikidata request and at most two Commons metadata requests. It tries up to two non-deprecated P18 image statements, preferring preferred-rank statements, then up to two P948 banner statements. It does not search by ambiguous destination names. Thumbnails must be landscape JPEG/PNG/WebP, with both original and returned sizes suitable for display. Small originals are rejected even if the API reports a larger thumbnail size. Very wide banners can fall back if their returned height is insufficient.

The initial licence policy accepts matching CC BY / CC BY-SA versions 1.0–4.0 (including 2.5 and two-letter ported jurisdictions), CC0, or a Commons public-domain designation. Missing authors, non-empty restriction metadata, unsupported terms and mismatched licence links are not selected. Author and additional attribution are stored as plain text, never source HTML. Destination details show author, source, licence and the crop indication; cards keep the photo area clear and link to destination details. Additional source credit is accessible beneath them. Responsive cropping does not establish which features are present or accessible today.

The command uses the same TypeScript image validator as application reads. `allowImportingTsExtensions` permits the native Node TypeScript command to import that shared file directly; no execution dependency is introduced.

## Refresh and failure behaviour

There is no automatic enrichment schedule. Rerunning a batch refreshes its selected metadata atomically. Source failure aborts before writes; a database failure rolls back the batch. Missing or ineligible source images do not erase an existing selection. Removing an existing stored selection is a separate operator action; it is not inferred from a temporary source gap. There is no manual destination/photo mapping in application code.

Image reads validate stored metadata and allow only HTTPS Wikimedia image URLs, Commons source links and matching supported licence URLs. A missing migration, unreadable optional image storage or invalid image record falls back without hiding destinations or private shortlist data. Next.js remote-image patterns are limited to the Wikimedia image hosts and Commons paths. Image loading is lazy and an image error preserves the landscape area and all destination actions. A photo remains illustrative, independently of evidence retrieval.

## Verification

On 3 November 2026, 12 sampled imported destinations across six countries all had source-linked image statements. Their Commons metadata included an undersized original and a ported licence, so availability alone is insufficient. Sanitised recorded responses cover these cases. A separate three-place Portugal CLI preview found three usable selections and saved none. Hosted migrations and image writes were not applied by implementation checks.

Source-fetch tests use external HTTP fixtures; storage tests use disposable PostgreSQL; browser journeys cover results, mixed authored/imported shortlists, details, attribution and mobile broken-image recovery. Browser image bytes are local HTTP fixtures, so CI does not depend on Wikimedia availability. Run:

```bash
npm run test:catalogue:db
npm run test:shortlists:db -- --browser
```

Source documentation: [Wikidata image](https://www.wikidata.org/wiki/Property:P18), [page banner](https://www.wikidata.org/wiki/Property:P948), [Commons image metadata API](https://www.mediawiki.org/wiki/API:Imageinfo), [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).
