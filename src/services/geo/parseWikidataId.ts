/** Bare Wikidata Q-id (no URL, no semicolon lists). */
export function isWikidataQid(value: string): boolean {
  return /^Q\d+$/.test(value);
}

/** Primary OSM `tags.wikidata` only; must be a bare Q-id after trim. */
export function parseWikidataId(tags?: Record<string, string>): string | undefined {
  const raw = tags?.wikidata?.trim();
  return raw && isWikidataQid(raw) ? raw : undefined;
}
