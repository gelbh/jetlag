import { useMapStore, type MapEngine } from "../../../state/mapStore";
import type { MapViewProps } from "./mapViewTypes";
import { MapViewLeaflet } from "./MapViewLeaflet";
import { MapViewMapLibre } from "./MapViewMapLibre";

export type { MapViewProps } from "./mapViewTypes";

function resolveMapEngine(
  storeEngine: MapEngine,
  override?: MapEngine,
): MapEngine {
  return override ?? storeEngine;
}

/** Map shell — Leaflet by default; MapLibre when `mapEngine` is set. */
export function MapView(
  props: MapViewProps & {
    /** Test/override; otherwise `useMapStore.mapEngine`. */
    mapEngine?: MapEngine;
  },
) {
  const storeEngine = useMapStore((s) => s.mapEngine);
  const engine = resolveMapEngine(storeEngine, props.mapEngine);

  if (engine === "maplibre") {
    return <MapViewMapLibre {...props} />;
  }
  return <MapViewLeaflet {...props} />;
}
