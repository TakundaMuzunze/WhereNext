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

const wikivoyageResponseSchema = z.object({
  query: z.object({
    pages: z.record(z.string(), z.unknown()),
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
    throw new Error(`Destination source unavailable (HTTP ${response.status}). No records imported.`);
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
export async function fetchDestinationCandidates(countryCode: CandidateCountry, limit: number, userAgent: string) {
  const isSupportedCountry = Object.hasOwn(candidateCountries, countryCode);
  const isValidLimit = Number.isInteger(limit) && limit >= 1 && limit <= 200;
  const hasUserAgent = userAgent.trim().length > 0;

  if (!isSupportedCountry || !isValidLimit || !hasUserAgent) {
    throw new Error("Choose a supported country, a limit from 1 to 200, and an identifying User-Agent.");
  }

  const countryWikidataId = candidateCountries[countryCode];
  const query = `SELECT DISTINCT ?place ?article WHERE {
    ?place wdt:P17 wd:${countryWikidataId}.
    ?article schema:about ?place; schema:isPartOf <https://en.wikivoyage.org/>.
  } ORDER BY ?place LIMIT ${limit + 1}`;

  const wikidataUrl = new URL("https://query.wikidata.org/sparql");
  wikidataUrl.search = new URLSearchParams({ query, format: "json" }).toString();

  const wikidataResponse = await fetchSourceJson(wikidataUrl, userAgent);
  const sourceDestinations = wikidataResponseSchema.parse(wikidataResponse).results.bindings;
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

      expectedWikidataIds.set(pageTitle, wikidataId);
    }

    const pageTitles = [...expectedWikidataIds.keys()];
    const wikivoyageUrl = new URL("https://en.wikivoyage.org/w/api.php");

    wikivoyageUrl.search = new URLSearchParams({
      action: "query",
      format: "json",
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
      throw new Error("Incomplete destination source response. No records imported.");
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
      const expectedWikidataId = expectedWikidataIds.get(page.title);
      const wikidataId = page.pageprops.wikibase_item;
      const hasMatchingIdentity = expectedWikidataId === wikidataId;

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
    throw new Error("Ambiguous destination identities. No records imported.");
  }

  return {
    candidates,
    scanned: selectedDestinations.length,
    skipped: skippedCount,
    truncated: sourceDestinations.length > limit,
  };
}
