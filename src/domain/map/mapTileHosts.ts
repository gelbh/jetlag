const ESRI_TILE_URL =
  /^https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/(?:World_Imagery|Reference\/World_Boundaries_and_Places)\/MapServer\/tile\//i;

const OPENFREEMAP_URL = /^https:\/\/tiles\.openfreemap\.org\//i;

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

export function isMapTileHostname(hostname: string): boolean {
  return (
    /^server\.arcgisonline\.com$/i.test(hostname) || /^tiles\.openfreemap\.org$/i.test(hostname)
  );
}
