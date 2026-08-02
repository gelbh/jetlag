import { createContext, useContext, type ReactNode } from "react";
import type { MapEngine } from "../../../state/mapStore";

const MapEngineContext = createContext<MapEngine>("leaflet");

export function MapEngineProvider({
  engine,
  children,
}: {
  engine: MapEngine;
  children: ReactNode;
}) {
  return (
    <MapEngineContext.Provider value={engine}>
      {children}
    </MapEngineContext.Provider>
  );
}

/** Active map shell engine. Defaults to leaflet outside a provider. */
export function useMapEngine(): MapEngine {
  return useContext(MapEngineContext);
}
