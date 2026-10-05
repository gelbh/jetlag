/** Primary OSM `tags.wikidata` only; must be a bare Q-id after trim. */
export function parseWikidataId(tags?: Record<string, string>): string | undefined {
  const raw = tags?.wikidata?.trim();
  return raw && /^Q\d+$/.test(raw) ? raw : undefined;
}
