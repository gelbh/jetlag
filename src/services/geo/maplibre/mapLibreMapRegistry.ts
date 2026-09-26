import type { Map as MapLibreMap } from "maplibre-gl";

let registeredMap: MapLibreMap | null = null;
const listeners = new Set<(map: MapLibreMap | null) => void>();

const E2E_MAP_WINDOW_KEY = "__JETLAG_MAPLIBRE__";

type JetlagMapWindow = Window & {
  [E2E_MAP_WINDOW_KEY]?: MapLibreMap | null;
};

/** Register the live play-map MapLibre instance for tool hooks outside the Map tree. */
export function registerMapLibreMap(map: MapLibreMap | null): void {
  registeredMap = map;
  // Playwright e2e fires map clicks via window (fiber walks miss react-map-gl).
  if (typeof window !== "undefined") {
    (window as JetlagMapWindow)[E2E_MAP_WINDOW_KEY] = map;
  }
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
