import { useCallback, useEffect, useState } from "react";
import {
  MAP_CHROME_DOCKS_CHANGE_EVENT,
  MAP_NAV_DOCK_STORAGE_KEY,
  legacyAnchorFromPlacement,
  mapSideDockIsLeft,
  readMapChromeDocksState,
  syncMapNavDockDataset,
  writeMapChromeDocksState,
  type MapChromeDockPlacement,
  type MapSideDockAnchor,
} from "./mapChromeDockPlacement";

export { MAP_NAV_DOCK_STORAGE_KEY };

/** Phone map-nav dock placement (shared store with session tools). */
export function useMapNavDockSide(): {
  placement: MapChromeDockPlacement;
  setPlacement: (placement: MapChromeDockPlacement) => void;
  /** @deprecated use placement */
  anchor: MapSideDockAnchor;
  /** @deprecated use setPlacement */
  setAnchor: (anchor: MapSideDockAnchor) => void;
} {
  const [placement, setPlacementState] = useState<MapChromeDockPlacement>(
    () => readMapChromeDocksState().nav,
  );

  useEffect(() => {
    syncMapNavDockDataset(placement);
    const sync = () => setPlacementState(readMapChromeDocksState().nav);
    window.addEventListener(MAP_CHROME_DOCKS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MAP_CHROME_DOCKS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [placement]);

  const setPlacement = useCallback((next: MapChromeDockPlacement) => {
    const state = readMapChromeDocksState();
    writeMapChromeDocksState({ ...state, nav: next });
    setPlacementState(next);
  }, []);

  const setAnchor = useCallback(
    (anchor: MapSideDockAnchor) => {
      setPlacement({
        side: mapSideDockIsLeft(anchor) ? "left" : "right",
        topRatio: anchor.startsWith("top")
          ? 0.08
          : anchor.startsWith("mid")
            ? 0.42
            : 0.72,
      });
    },
    [setPlacement],
  );

  return {
    placement,
    setPlacement,
    anchor: legacyAnchorFromPlacement(placement),
    setAnchor,
  };
}
