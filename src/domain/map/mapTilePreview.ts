import type { MapStyle, StreetBasemap } from "./mapBasemaps";

export const MAP_STYLE_PREVIEW_ZOOM = 15;

export const MAP_STYLE_PREVIEW_ASSETS = {
  standard: {
    light: "/map-preview/street-light.svg",
    dark: "/map-preview/street-dark.svg",
  },
  satellite: "/map-preview/satellite.svg",
} as const;

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

export function mapStylePreviewAssetUrl(
  style: MapStyle,
  streetBasemap: StreetBasemap = "light",
): string {
  if (style === "satellite") {
    return MAP_STYLE_PREVIEW_ASSETS.satellite;
  }
  return MAP_STYLE_PREVIEW_ASSETS.standard[streetBasemap];
}

/** Four identical static preview tiles for the style-toggle 2×2 grid. */
export function mapStylePreviewTileUrls(
  style: MapStyle,
  streetBasemap: StreetBasemap = "light",
): string[] {
  const asset = mapStylePreviewAssetUrl(style, streetBasemap);
  return [asset, asset, asset, asset];
}

export function previewTileUrlsForStyle(
  style: MapStyle,
  lat: number,
  lng: number,
  zoom = MAP_STYLE_PREVIEW_ZOOM,
  streetBasemap: StreetBasemap = "light",
): string[] {
  void lat;
  void lng;
  void zoom;
  return mapStylePreviewTileUrls(style, streetBasemap);
}

export function previewTileUrlsFromOrigin(
  style: MapStyle,
  x: number,
  y: number,
  zoom = MAP_STYLE_PREVIEW_ZOOM,
  streetBasemap: StreetBasemap = "light",
): string[] {
  void x;
  void y;
  void zoom;
  return mapStylePreviewTileUrls(style, streetBasemap);
}
