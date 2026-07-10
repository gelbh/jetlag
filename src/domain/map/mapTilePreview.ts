import {
  getMapBasemap,
  type MapBasemapDefinition,
  type MapStyle,
} from "./mapBasemaps";

export const MAP_STYLE_PREVIEW_ZOOM = 15;

export function latLngToTileXY(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const latRad = (lat * Math.PI) / 180;
  const scale = 2 ** zoom;
  const x = Math.floor(((lng + 180) / 360) * scale);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      scale,
  );

  return { x, y };
}

export function buildMapTileUrl(
  basemap: MapBasemapDefinition,
  x: number,
  y: number,
  z: number,
): string {
  let url = basemap.url
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y))
    .replace("{r}", "");

  if (basemap.subdomains) {
    const index = (x + y + z) % basemap.subdomains.length;
    url = url.replace("{s}", basemap.subdomains[index] ?? "a");
  }

  return url;
}

export function previewTileUrlsForStyle(
  style: MapStyle,
  lat: number,
  lng: number,
  zoom = MAP_STYLE_PREVIEW_ZOOM,
): string[] {
  const { x, y } = latLngToTileXY(lat, lng, zoom);
  return previewTileUrlsFromOrigin(style, x, y, zoom);
}

export function previewTileUrlsFromOrigin(
  style: MapStyle,
  x: number,
  y: number,
  zoom = MAP_STYLE_PREVIEW_ZOOM,
): string[] {
  const basemap = getMapBasemap(style);

  return [
    [x, y],
    [x + 1, y],
    [x, y + 1],
    [x + 1, y + 1],
  ].map(([tileX, tileY]) => buildMapTileUrl(basemap, tileX, tileY, zoom));
}
