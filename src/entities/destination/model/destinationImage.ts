import { z } from "zod";

function isCommonsImageUrl(value: string): boolean {
  if (!URL.canParse(value)) {
    return false;
  }

  const url = new URL(value);
  const hasTrustedHost = url.hostname === "upload.wikimedia.org" || url.hostname === "thumb.wikimedia.org";

  return url.protocol === "https:" && hasTrustedHost && url.pathname.startsWith("/wikipedia/commons/") && !url.username && !url.password && !url.port;
}

function hasReusableLicense(image: { license: string; licenseUrl: string; sourceUrl: string }): boolean {
  if (image.license === "Public domain") {
    return image.licenseUrl === image.sourceUrl;
  }

  if (!URL.canParse(image.licenseUrl)) {
    return false;
  }

  const url = new URL(image.licenseUrl);

  if (url.origin !== "https://creativecommons.org" || url.username || url.password || url.search || url.hash) {
    return false;
  }

  if (image.license === "CC0") {
    return url.pathname === "/publicdomain/zero/1.0/";
  }

  const licenseMatch = /^CC (BY|BY-SA) (1\.0|2\.0|2\.5|3\.0|4\.0)(?: ([a-z]{2}))?$/.exec(image.license);

  if (!licenseMatch) {
    return false;
  }

  const [, family, version, jurisdiction] = licenseMatch;
  let expectedPath = `/licenses/${family.toLowerCase()}/${version}`;

  if (jurisdiction) {
    expectedPath += `/${jurisdiction}`;
  }

  const actualPath = url.pathname.replace(/\/deed\.[a-z_-]+\/?$/, "").replace(/\/$/, "");

  return actualPath === expectedPath;
}

export const destinationImageSchema = z
  .object({
    src: z.url().refine(isCommonsImageUrl),
    fileTitle: z.string().startsWith("File:").max(500),
    sourceUrl: z.url().startsWith("https://commons.wikimedia.org/wiki/File:"),
    author: z.string().min(1).max(2000),
    license: z.string().min(1).max(100),
    licenseUrl: z.url(),
    attribution: z.string().max(4000),
    width: z.number().int().min(640).max(2560),
    height: z.number().int().min(300),
  })
  .refine((image) => image.width >= image.height, "Destination images must be landscape.")
  .refine(hasReusableLicense, "Image licence and licence URL must identify the same supported terms.");

export type DestinationImage = z.infer<typeof destinationImageSchema>;
