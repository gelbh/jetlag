export type MapStyle = "standard" | "satellite";
export type StreetBasemap = "light" | "dark";
export type BasemapSurface = "light" | "dark" | "satellite";

export interface MapBasemapDefinition {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
  overlays?: readonly MapBasemapDefinition[];
}

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const ESRI_ATTRIBUTION_TEXT =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

const STREET_BASEMAPS = {
  light: {
    id: "street-light",
    label: "Map",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 20,
    subdomains: "abcd",
  },
  dark: {
    id: "street-dark",
    label: "Map",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTRIBUTION,
    maxZoom: 20,
    subdomains: "abcd",
  },
} as const satisfies Record<StreetBasemap, MapBasemapDefinition>;

const SATELLITE_BASEMAP = {
  id: "satellite",
  label: "Satellite",
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  attribution: ESRI_ATTRIBUTION,
  maxZoom: 19,
} as const satisfies MapBasemapDefinition;

/** @deprecated Prefer getMapBasemap(style, streetBasemap). Kept for call sites mid-migration. */
export const MAP_BASEMAPS = {
  standard: STREET_BASEMAPS.light,
  satellite: SATELLITE_BASEMAP,
} as const;

export function getStreetBasemap(
  streetBasemap: StreetBasemap = "light",
): MapBasemapDefinition {
  return STREET_BASEMAPS[streetBasemap];
}

export function getMapBasemap(
  style: MapStyle,
  streetBasemap: StreetBasemap = "light",
): MapBasemapDefinition {
  if (style === "satellite") {
    return { ...SATELLITE_BASEMAP, overlays: [] };
  }
  return { ...getStreetBasemap(streetBasemap), overlays: [] };
}

export function getBasemapSurface(
  style: MapStyle,
  streetBasemap: StreetBasemap = "light",
): BasemapSurface {
  if (style === "satellite") {
    return "satellite";
  }
  return streetBasemap;
}

/** Plain-text basemap credits for settings / chrome. */
export function getBasemapAttributionText(style: MapStyle): string {
  if (style === "satellite") {
    return ESRI_ATTRIBUTION_TEXT;
  }
  return OPENFREEMAP_ATTRIBUTION_TEXT;
}

const OPENFREEMAP_ATTRIBUTION_TEXT =
  "Map data © OpenStreetMap contributors · © OpenFreeMap";

/** OpenFreeMap style URLs (no API key). Light locked to liberty after Slice 1 smoke. */
export const OPENFREEMAP_STYLE_URLS = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/** Inline MapLibre style for Esri World Imagery (raster-only). */
export type MapLibreSatelliteStyle = {
  version: 8;
  sources: {
    esri: {
      type: "raster";
      tiles: string[];
      tileSize?: number;
      attribution?: string;
      maxzoom?: number;
    };
  };
  layers: Array<{
    id: string;
    type: "raster";
    source: "esri";
  }>;
};

/** MapLibre `mapStyle` — style URL for streets, inline raster style for satellite. */
export function getMapLibreStyle(
  style: MapStyle,
  streetBasemap: StreetBasemap = "light",
): string | MapLibreSatelliteStyle {
  if (style === "satellite") {
    return {
      version: 8,
      sources: {
        esri: {
          type: "raster",
          tiles: [SATELLITE_BASEMAP.url],
          tileSize: 256,
          attribution: ESRI_ATTRIBUTION_TEXT,
          maxzoom: SATELLITE_BASEMAP.maxZoom,
        },
      },
      layers: [{ id: "esri-world-imagery", type: "raster", source: "esri" }],
    };
  }
  return OPENFREEMAP_STYLE_URLS[streetBasemap];
}
