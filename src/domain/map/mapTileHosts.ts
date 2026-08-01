/**
 * Canonical basemap tile host matchers for SW cache routes and e2e network policy.
 * Keep `public/_headers` img-src/connect-src basemap hosts in sync with these hosts
 * (CSP cannot import this module — checklist when editing tile providers).
 */

const CARTO_TILE_URL =
  /^https:\/\/([a-d]\.)?basemaps\.cartocdn\.com\/(rastertiles\/voyager|dark_all)\//i;

const ESRI_TILE_URL =
  /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\//i;

export function isCartoTileUrl(href: string): boolean {
  return CARTO_TILE_URL.test(href);
}

export function isEsriWorldImageryTileUrl(href: string): boolean {
  return ESRI_TILE_URL.test(href);
}

/** Hostname-only check for Playwright external-asset gating. */
export function isMapTileHostname(hostname: string): boolean {
  return (
    /^(?:[a-d]\.)?basemaps\.cartocdn\.com$/i.test(hostname) ||
    /^server\.arcgisonline\.com$/i.test(hostname)
  );
}
