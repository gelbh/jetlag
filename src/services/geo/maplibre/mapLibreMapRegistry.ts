import type { Map as MapLibreMap } from "maplibre-gl";

let registeredMap: MapLibreMap | null = null;
const listeners = new Set<(map: MapLibreMap | null) => void>();

/** Register the live play-map MapLibre instance for tool hooks outside the Map tree. */
export function registerMapLibreMap(map: MapLibreMap | null): void {
  registeredMap = map;
  for (const listener of listeners) {
    listener(map);
  }
}

export function getRegisteredMapLibreMap(): MapLibreMap | null {
  return registeredMap;
}

export function subscribeRegisteredMapLibreMap(
  listener: (map: MapLibreMap | null) => void,
): () => void {
  listeners.add(listener);
  listener(registeredMap);
  return () => {
    listeners.delete(listener);
  };
}
