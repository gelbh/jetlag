import type { MapStyle, StreetBasemap } from "../../../domain/map/mapBasemaps";
import { getBasemapSurface } from "../../../domain/map/mapBasemaps";

/** Shared HTML/class for map label markers (Leaflet DivIcon + MapLibre). */
export interface MapHtmlMarkup {
  className: string;
  html: string;
}

/** Shared HTML/class for thermometer progress labels (Leaflet + MapLibre). */
export function thermometerWalkProgressMarkup(
  walkedLabel: string,
  targetLabel: string | null,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
): MapHtmlMarkup {
  const surface = getBasemapSurface(mapStyle, streetBasemap);
  const variant =
    surface === "satellite" || surface === "dark"
      ? "jl-thermometer-walk-progress--satellite"
      : "jl-thermometer-walk-progress--standard";
  const targetHtml = targetLabel
    ? `<span class="jl-thermometer-walk-progress__target"> / ${targetLabel}</span>`
    : "";

  return {
    className: `jl-thermometer-walk-progress ${variant}`,
    html: `<span class="jl-thermometer-walk-progress__pill"><span class="jl-thermometer-walk-progress__walked">${walkedLabel}</span>${targetHtml}</span>`,
  };
}

/** Shared HTML/class for thermometer end labels (Leaflet + MapLibre). */
export function thermometerWalkEndLabelMarkup(
  label: string,
  mapStyle: MapStyle,
  streetBasemap: StreetBasemap = "light",
): MapHtmlMarkup {
  const surface = getBasemapSurface(mapStyle, streetBasemap);
  const variant =
    surface === "satellite" || surface === "dark"
      ? "jl-thermometer-walk-end-label--satellite"
      : "jl-thermometer-walk-end-label--standard";

  return {
    className: `jl-thermometer-walk-end-label ${variant}`,
    html: `<span class="jl-thermometer-walk-end-label__text">${label}</span>`,
  };
}
