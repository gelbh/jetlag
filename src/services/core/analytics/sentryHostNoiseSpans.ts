/**
 * Stream-lifecycle Sentry cannot status-filter spans (beforeSendSpan must not
 * return null; ignoreSpans is evaluated at span start before status exists).
 * Name substring match drops cancelled and successful OpenFreeMap tile spans.
 */
export const OPEN_FREEMAP_TILE_IGNORE_SPAN = "tiles.openfreemap.org";

/** True when a span description/name should be ignored as tile host noise. */
export function isOpenFreeMapTileNoiseSpanName(description: string): boolean {
  return description.includes(OPEN_FREEMAP_TILE_IGNORE_SPAN);
}
