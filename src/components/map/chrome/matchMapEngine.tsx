import type { ReactNode } from "react";
import type { MapEngine } from "../../../state/mapStore";

/** Exhaustive MapEngine branch — new engines fail at compile time. */
export function matchMapEngine(
  engine: MapEngine,
  branches: {
    leaflet: () => ReactNode;
    maplibre: () => ReactNode;
  },
): ReactNode {
  switch (engine) {
    case "leaflet":
      return branches.leaflet();
    case "maplibre":
      return branches.maplibre();
    default: {
      const _exhaustive: never = engine;
      return _exhaustive;
    }
  }
}
