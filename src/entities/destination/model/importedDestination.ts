export type DestinationSummary = {
  id: string;
  name: string;
  country: string;
};

export type ImportedDestination = DestinationSummary & {
  countryCode: string;
  latitude: number;
  longitude: number;
  sourceUrl: string;
  sourceRevisionId: number;
  importedAt: string;
};

export function isImportedDestinationId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && /^wikidata:Q[1-9]\d*$/.test(value);
}
