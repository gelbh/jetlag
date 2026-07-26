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
  attribution:
    "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
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
