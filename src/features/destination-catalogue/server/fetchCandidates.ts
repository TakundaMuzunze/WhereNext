import { CatalogueImportError } from "./catalogueImportLock.ts";
import { z } from "zod";

export const candidateCountries = {
  PT: "Q45",
  ES: "Q29",
  FR: "Q142",
  IT: "Q38",
  GR: "Q41",
  MT: "Q233",
} as const;

const pageBatchSize = 50;
const sourceRequestTimeoutMs = 30_000;
const batchDelayMs = 30_000;

export type CandidateCountry = keyof typeof candidateCountries;

export type DestinationCandidate = {
  id: string;
  wikidataId: string;
  wikivoyagePageId: number;
  name: string;
  countryCode: CandidateCountry;
  latitude: number;
  longitude: number;
  sourceUrl: string;
  sourceRevisionId: number;
  guideStatus: "usable" | "guide" | "star";
  importedAt: Date;
};

const wikidataResponseSchema = z.object({
  results: z.object({
    bindings: z.array(
      z.object({
        place: z.object({
          value: z.string().regex(/^http:\/\/www\.wikidata\.org\/entity\/Q[1-9]\d*$/),
        }),
        article: z.object({
          value: z.url().startsWith("https://en.wikivoyage.org/wiki/"),
        }),
      }),
    ),
  }),
});

const wikivoyagePageSchema = z.object({
  pageid: z.number().int().positive(),
  title: z.string().min(1),
  pageprops: z.object({ wikibase_item: z.string().regex(/^Q[1-9]\d*$/) }),
  coordinates: z
    .array(
      z.object({
        lat: z.number().min(-90).max(90),
        lon: z.number().min(-180).max(180),
        globe: z.literal("earth"),
        primary: z.string(),
      }),
    )
    .min(1)
    .max(1),
  categories: z.array(z.object({ title: z.string() })),
  revisions: z.array(z.object({ revid: z.number().int().positive() })).length(1),
});

const titleChangeSchema = z.object({ from: z.string().min(1), to: z.string().min(1) });

const wikivoyageResponseSchema = z.object({
  query: z.object({
    pages: z.record(z.string(), z.unknown()),
    normalized: z.array(titleChangeSchema).optional(),
    redirects: z.array(titleChangeSchema).optional(),
  }),
  continue: z.unknown().optional(),
});

async function fetchSourceJson(url: URL, userAgent: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    redirect: "error",
    signal: AbortSignal.timeout(sourceRequestTimeoutMs),
  });

  if (!response.ok) {
    throw new CatalogueImportError(`Destination source unavailable (HTTP ${response.status}). No records imported.`);
  }

  return response.json();
}

function getGuideStatus(categories: Set<string>): DestinationCandidate["guideStatus"] | null {
  if (categories.has("Category:Star cities")) {
    return "star";
  }

  if (categories.has("Category:Guide cities")) {
    return "guide";
  }

  if (categories.has("Category:Usable cities")) {
    return "usable";
  }

  return null;
}

// bounded preview/import, not an exhaustive country inventory.
export async function fetchDestinationCandidates(countryCode: CandidateCountry, limit: number, userAgent: string, cursor: string | null = null) {
  const isSupportedCountry = Object.hasOwn(candidateCountries, countryCode);
  const isValidLimit = Number.isInteger(limit) && limit >= 1 && limit <= 200;
  const hasUserAgent = userAgent.trim().length > 0;

  if (!isSupportedCountry || !isValidLimit || !hasUserAgent) {
    throw new CatalogueImportError("Choose a supported country, a limit from 1 to 200, and an identifying User-Agent.");
  }

  let cursorFilter = "";
  let previousPlaceUrl = "";

  if (cursor !== null) {
    const [cursorCountryCode, lastWikidataId, ...extraParts] = cursor.split(":");
    const hasValidWikidataId = /^Q[1-9]\d*$/.test(lastWikidataId ?? "");

    if (cursorCountryCode !== countryCode || !hasValidWikidataId || extraParts.length > 0) {
      throw new CatalogueImportError("Use a valid resume cursor for the selected country.");
    }

    previousPlaceUrl = `http://www.wikidata.org/entity/${lastWikidataId}`;
    cursorFilter = `FILTER(STR(?place) > "${previousPlaceUrl}")`;
  }

  const countryWikidataId = candidateCountries[countryCode];
  const query = `SELECT DISTINCT ?place ?article WHERE {
    ?place wdt:P17 wd:${countryWikidataId}.
    ?article schema:about ?place; schema:isPartOf <https://en.wikivoyage.org/>.
    ${cursorFilter}
  } ORDER BY STR(?place) LIMIT ${limit + 1}`;

  const wikidataUrl = new URL("https://query.wikidata.org/sparql");
  wikidataUrl.search = new URLSearchParams({ query, format: "json" }).toString();

  const wikidataResponse = await fetchSourceJson(wikidataUrl, userAgent);
  const sourceDestinations = wikidataResponseSchema.parse(wikidataResponse).results.bindings;

  // Compare full URLs alphabetically, using the same order as the source query.
  for (const destination of sourceDestinations) {
    const placeUrl = destination.place.value;

    if (placeUrl <= previousPlaceUrl) {
      throw new CatalogueImportError("Destination source did not advance in the requested order. No records imported.");
    }

    previousPlaceUrl = placeUrl;
  }

  const selectedDestinations = sourceDestinations.slice(0, limit);

  const candidates: DestinationCandidate[] = [];
  let skippedCount = 0;

  for (let offset = 0; offset < selectedDestinations.length; offset += pageBatchSize) {
    // Pace batches so importing does not overwhelm the source.
    if (offset > 0) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }

    const destinationBatch = selectedDestinations.slice(offset, offset + pageBatchSize);
    const expectedWikidataIds = new Map<string, string>();

    for (const destination of destinationBatch) {
      const articleUrl = new URL(destination.article.value);
      const encodedTitle = articleUrl.pathname.slice("/wiki/".length);
      const pageTitle = decodeURIComponent(encodedTitle).replaceAll("_", " ");
      const wikidataId = destination.place.value.replace("http://www.wikidata.org/entity/", "");

      if (expectedWikidataIds.has(pageTitle)) {
        throw new CatalogueImportError("Ambiguous destination identities share a source title. No records imported.");
      }

      expectedWikidataIds.set(pageTitle, wikidataId);
    }

    const pageTitles = [...expectedWikidataIds.keys()];
    const wikivoyageUrl = new URL("https://en.wikivoyage.org/w/api.php");

    wikivoyageUrl.search = new URLSearchParams({
      action: "query",
      format: "json",
      redirects: "1",
      titles: pageTitles.join("|"),
      prop: "pageprops|coordinates|categories|revisions",
      ppprop: "wikibase_item",
      coprimary: "primary",
      colimit: "max",
      clcategories: "Category:City_articles|Category:Usable_cities|Category:Guide_cities|Category:Star_cities",
      cllimit: "500",
      rvprop: "ids",
      maxlag: "5",
    }).toString();

    const wikivoyageResponse = await fetchSourceJson(wikivoyageUrl, userAgent);
    const validatedResponse = wikivoyageResponseSchema.parse(wikivoyageResponse);

    if (validatedResponse.continue) {
      throw new CatalogueImportError("Incomplete destination source response. No records imported.");
    }

    const titleChanges = new Map<string, string>();
    const changes = [...(validatedResponse.query.normalized ?? []), ...(validatedResponse.query.redirects ?? [])];

    for (const change of changes) {
      if (titleChanges.has(change.from)) {
        throw new CatalogueImportError("Ambiguous destination title changes. No records imported.");
      }
      titleChanges.set(change.from, change.to);
    }

    const resolvedIdentities = new Map<string, string>();

    for (const [requestedTitle, wikidataId] of expectedWikidataIds) {
      let resolvedTitle = requestedTitle;
      const visitedTitles = new Set<string>();

      while (titleChanges.has(resolvedTitle)) {
        if (visitedTitles.has(resolvedTitle)) {
          throw new CatalogueImportError("Circular destination redirect. No records imported.");
        }
        visitedTitles.add(resolvedTitle);
        resolvedTitle = titleChanges.get(resolvedTitle)!;
      }

      if (resolvedIdentities.has(resolvedTitle)) {
        throw new CatalogueImportError("Ambiguous destination identities share a redirect target. No records imported.");
      }
      resolvedIdentities.set(resolvedTitle, wikidataId);
    }

    for (const sourcePage of Object.values(validatedResponse.query.pages)) {
      const parsedPage = wikivoyagePageSchema.safeParse(sourcePage);

      if (!parsedPage.success) {
        skippedCount++;
        continue;
      }

      const page = parsedPage.data;
      const categories = new Set(page.categories.map((category) => category.title));
      const guideStatus = getGuideStatus(categories);
      const isCityArticle = categories.has("Category:City articles");
      const expectedWikidataId = resolvedIdentities.get(page.title);
      const wikidataId = page.pageprops.wikibase_item;
      const hasMatchingIdentity = expectedWikidataId === wikidataId;

      if (expectedWikidataId && !hasMatchingIdentity) {
        throw new CatalogueImportError(
          `Destination identity changed from ${expectedWikidataId} to ${wikidataId}. Review the source; no records imported.`,
        );
      }

      if (!guideStatus || !isCityArticle || !hasMatchingIdentity) {
        skippedCount++;
        continue;
      }

      const coordinates = page.coordinates[0];
      const revision = page.revisions[0];
      const encodedTitle = encodeURIComponent(page.title.replaceAll(" ", "_"));

      candidates.push({
        id: `wikidata:${wikidataId}`,
        wikidataId,
        wikivoyagePageId: page.pageid,
        name: page.title,
        countryCode,
        latitude: coordinates.lat,
        longitude: coordinates.lon,
        sourceUrl: `https://en.wikivoyage.org/wiki/${encodedTitle}`,
        sourceRevisionId: revision.revid,
        guideStatus,
        importedAt: new Date(),
      });
    }
  }

  const uniqueDestinationIds = new Set(candidates.map((candidate) => candidate.id));

  if (uniqueDestinationIds.size !== candidates.length) {
    throw new CatalogueImportError("Ambiguous destination identities. No records imported.");
  }

  const truncated = sourceDestinations.length > limit;
  let nextCursor: string | null = null;

  if (truncated) {
    // Skipped records must advance the cursor too, otherwise a run could get stuck.
    const lastScannedDestination = selectedDestinations[selectedDestinations.length - 1];
    const lastWikidataId = lastScannedDestination.place.value.replace("http://www.wikidata.org/entity/", "");

    nextCursor = `${countryCode}:${lastWikidataId}`;
  }

  return {
    candidates,
    scanned: selectedDestinations.length,
    skipped: Math.max(skippedCount, selectedDestinations.length - candidates.length),
    truncated,
    nextCursor,
  };
}
