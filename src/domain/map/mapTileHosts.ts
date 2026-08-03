/**
 * Canonical basemap tile host matchers for SW cache routes and e2e network policy.
 * Keep `public/_headers` img-src/connect-src basemap hosts in sync with these hosts
 * (CSP cannot import this module — checklist when editing tile providers).
 */

const ESRI_TILE_URL =
  /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/(?:World_Imagery|Reference\/World_Boundaries_and_Places)\/MapServer\/tile\//i;

/** OpenFreeMap tiles, fonts, sprites, style JSON, and planet tilejson. */
const OPENFREEMAP_URL =
  /^https:\/\/tiles\.openfreemap\.org\//i;

export function isEsriTileUrl(href: string): boolean {
  return ESRI_TILE_URL.test(href);
}

/** @deprecated Prefer isEsriTileUrl. */
export function isEsriWorldImageryTileUrl(href: string): boolean {
  return isEsriTileUrl(href);
}

export function isOpenFreeMapUrl(href: string): boolean {
  return OPENFREEMAP_URL.test(href);
}

/** Hostname-only check for Playwright external-asset gating. */
export function isMapTileHostname(hostname: string): boolean {
  return (
    /^server\.arcgisonline\.com$/i.test(hostname) ||
    /^tiles\.openfreemap\.org$/i.test(hostname)
  );
}
