import type { Map } from "leaflet";

/** Portal HUD controls outside the transformed Leaflet container. */
export function getMapChromePortalTarget(map: Map): HTMLElement | null {
  return map.getContainer().parentElement;
}
