import { createContext, useContext, type ReactNode } from "react";
import type { MapEngine } from "../../../state/mapStore";

const MapEngineContext = createContext<MapEngine | null>(null);

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

/** Active map shell engine. Must be used under MapEngineProvider. */
export function useMapEngine(): MapEngine {
  const engine = useContext(MapEngineContext);
  if (engine == null) {
    throw new Error("useMapEngine must be used within MapEngineProvider");
  }
  return engine;
}
