import { z } from "zod";
import { destinationImageSchema, type DestinationImage } from "../../../entities/destination/model/destinationImage.ts";

export type DestinationImageResult = {
  destinationId: string;
  image: DestinationImage | null;
};

const metadataField = z.object({ value: z.string() }).optional();
const commonsPageSchema = z.object({
  title: z.string().startsWith("File:"),
  imageinfo: z
    .array(
      z.object({
        thumburl: z.url(),
        descriptionurl: z.url(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        thumbwidth: z.number().int().positive(),
        thumbheight: z.number().int().positive(),
        mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
        extmetadata: z.object({
          Artist: metadataField,
          LicenseShortName: metadataField,
          LicenseUrl: metadataField,
          Attribution: metadataField,
          Credit: metadataField,
          Restrictions: metadataField,
        }),
      }),
    )
    .length(1),
});

async function sourceJson(url: URL, userAgent: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Image source unavailable (HTTP ${response.status}). Existing images were retained.`);
  }

  return response.json();
}

// Metadata is displayed as text, never injected as HTML. Decode common/numeric entities for legible credits.
function plainText(value = ""): string {
  const withoutMarkup = value.replace(/<[^>]*>/g, " ");
  const namedEntities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };

  return withoutMarkup
    .replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity: string, name: string) => {
      if (!name.startsWith("#")) {
        return namedEntities[name.toLowerCase()] ?? entity;
      }

      const isHexadecimal = name.toLowerCase().startsWith("#x");
      const codePoint = Number.parseInt(name.slice(isHexadecimal ? 2 : 1), isHexadecimal ? 16 : 10);

      if (codePoint < 32 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        return " ";
      }

      return String.fromCodePoint(codePoint);
    })
    .replace(/\s+/g, " ")
    .trim();
}

function translateCommonsPage(input: unknown): DestinationImage | null {
  const validation = commonsPageSchema.safeParse(input);

  if (!validation.success) {
    return null;
  }

  const page = validation.data;
  const info = page.imageinfo[0];
  const metadata = info.extmetadata;
  const src = new URL(info.thumburl);
  const hasUsableDimensions =
    info.width >= 640 &&
    info.height >= 300 &&
    info.thumbheight >= 300 &&
    info.thumbwidth >= 640 &&
    info.thumbwidth <= 2560 &&
    info.width >= info.height;
  const sourceUrl = new URL(info.descriptionurl);

  if (!hasUsableDimensions) {
    return null;
  }

  const author = plainText(metadata.Artist?.value);
  const license = plainText(metadata.LicenseShortName?.value);
  const attributionParts = [plainText(metadata.Attribution?.value), plainText(metadata.Credit?.value)].filter(Boolean);
  const attribution = [...new Set(attributionParts)].join(" · ");
  const restrictions = plainText(metadata.Restrictions?.value);
  let licenseUrl = metadata.LicenseUrl?.value ?? "";

  if (license === "Public domain") {
    licenseUrl = sourceUrl.href;
  } else {
    const validation = z.url().safeParse(licenseUrl);

    if (!validation.success) {
      return null;
    }

    const url = new URL(licenseUrl);

    url.protocol = "https:";
    licenseUrl = url.href;
  }

  if (!author || author.length > 2000 || attribution.length > 4000 || restrictions) {
    return null;
  }

  src.search = "";

  const image = destinationImageSchema.safeParse({
    src: src.href,
    fileTitle: page.title,
    sourceUrl: sourceUrl.href,
    author,
    license,
    licenseUrl,
    attribution,
    width: info.thumbwidth,
    height: info.thumbheight,
  });

  return image.success ? image.data : null;
}

function fileKey(title: string): string {
  return title.replace(/_/g, " ").normalize("NFC");
}

export async function fetchDestinationImages(destinationIds: string[], userAgent: string): Promise<DestinationImageResult[]> {
  const ids = z
    .array(z.string().regex(/^wikidata:Q[1-9]\d*$/))
    .min(1)
    .max(25)
    .parse(destinationIds);

  if (!userAgent.trim()) {
    throw new Error("Provide an identifying User-Agent.");
  }

  const wikidataIds = [...new Set(ids.map((id) => id.replace("wikidata:", "")))];
  const wikidataUrl = new URL("https://www.wikidata.org/w/api.php");
  wikidataUrl.search = new URLSearchParams({ action: "wbgetentities", ids: wikidataIds.join("|"), props: "claims", format: "json" }).toString();
  const entityResponse = z.object({ entities: z.record(z.string(), z.unknown()) }).parse(await sourceJson(wikidataUrl, userAgent));
  const claimSchema = z.object({
    rank: z.enum(["normal", "preferred", "deprecated"]),
    mainsnak: z.object({ datavalue: z.object({ value: z.string().min(1).max(495) }) }),
  });
  const entitySchema = z.object({ id: z.string(), claims: z.record(z.string(), z.array(z.unknown())) });
  const fileChoices = new Map<string, string[]>();

  for (const wikidataId of wikidataIds) {
    const entity = entitySchema.safeParse(entityResponse.entities[wikidataId]);
    const titles: string[] = [];

    if (entity.success && entity.data.id === wikidataId) {
      for (const property of ["P18", "P948"]) {
        const claims = entity.data.claims[property] ?? [];
        const validatedClaims = claims
          .map((claim) => claimSchema.safeParse(claim))
          .filter((claim) => claim.success)
          .map((claim) => claim.data);
        const preferredClaims = validatedClaims.filter((claim) => claim.rank === "preferred");
        const normalClaims = validatedClaims.filter((claim) => claim.rank === "normal");

        for (const claim of [...preferredClaims, ...normalClaims].slice(0, 2)) {
          titles.push(`File:${claim.mainsnak.datavalue.value}`);
        }
      }
    }

    fileChoices.set(wikidataId, [...new Set(titles)]);
  }

  const allTitles = [...new Set([...fileChoices.values()].flat())];
  const imagesByTitle = new Map<string, DestinationImage>();

  // Up to four source-linked alternatives per destination; Commons accepts 50 titles per request.
  for (let start = 0; start < allTitles.length; start += 50) {
    const commonsUrl = new URL("https://commons.wikimedia.org/w/api.php");
    commonsUrl.search = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "imageinfo",
      titles: allTitles.slice(start, start + 50).join("|"),
      iiprop: "url|size|mime|extmetadata",
      iiurlwidth: "2560",
    }).toString();
    const commonsResponse = z
      .object({ query: z.object({ pages: z.record(z.string(), z.unknown()) }) })
      .parse(await sourceJson(commonsUrl, userAgent));

    for (const page of Object.values(commonsResponse.query.pages)) {
      const image = translateCommonsPage(page);

      if (image) {
        imagesByTitle.set(fileKey(image.fileTitle), image);
      }
    }
  }

  return ids.map((destinationId) => {
    const wikidataId = destinationId.replace("wikidata:", "");

    for (const title of fileChoices.get(wikidataId) ?? []) {
      const image = imagesByTitle.get(fileKey(title));

      if (image) {
        return { destinationId, image };
      }
    }

    return { destinationId, image: null };
  });
}
