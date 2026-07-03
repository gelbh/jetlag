export type MapStyle = "standard" | "satellite";

export interface MapBasemapDefinition {
  id: MapStyle;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

export const MAP_BASEMAPS = {
  standard: {
    id: "standard",
    label: "Standard",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  satellite: {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
} as const satisfies Record<MapStyle, MapBasemapDefinition>;

export function getMapBasemap(style: MapStyle): MapBasemapDefinition {
  return MAP_BASEMAPS[style];
}
