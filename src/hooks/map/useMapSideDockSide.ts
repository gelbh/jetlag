import { useCallback, useEffect, useState } from "react";
import {
  MAP_CHROME_DOCKS_CHANGE_EVENT,
  legacyAnchorFromPlacement,
  mapSideDockIsLeft,
  readMapChromeDocksState,
  syncMapSideDockDataset,
  writeMapChromeDocksState,
  type MapChromeDockPlacement,
  type MapSideDockAnchor,
} from "./mapChromeDockPlacement";

export type { MapSideDockAnchor, MapChromeDockPlacement };
export {
  MAP_NAV_DOCK_STORAGE_KEY,
  normalizeStoredAnchor,
  placementFromLegacyAnchor,
  legacyAnchorFromPlacement,
  resolveStackedTops,
  sideFromPointX,
  topPxFromTopRatio,
  topRatioFromTopPx,
  clampTopPx,
  usableVerticalBand,
  mapSideDockIsLeft,
  readMapChromeDocksState,
  writeMapChromeDocksState,
} from "./mapChromeDockPlacement";

export const MAP_SIDE_DOCK_ANCHORS: readonly MapSideDockAnchor[] = [
  "top-right",
  "mid-right",
  "bottom-right",
  "top-left",
  "mid-left",
  "bottom-left",
] as const;

export function mapSideDockIsTop(anchor: MapSideDockAnchor): boolean {
  return anchor === "top-left" || anchor === "top-right";
}

/** Keyboard nudge: step down the band, then flip side. */
export function cycleMapChromeDockPlacement(
  placement: MapChromeDockPlacement,
): MapChromeDockPlacement {
  const stepped = placement.topRatio + 0.28;
  if (stepped <= 1.001) {
    return { ...placement, topRatio: Math.min(1, stepped) };
  }
  return {
    side: placement.side === "left" ? "right" : "left",
    topRatio: 0.08,
  };
}

/** @deprecated prefer cycleMapChromeDockPlacement */
export function cycleMapSideDockAnchor(
  anchor: MapSideDockAnchor,
): MapSideDockAnchor {
  const order = MAP_SIDE_DOCK_ANCHORS;
  const index = order.indexOf(anchor);
  return order[(index + 1) % order.length] ?? "bottom-right";
}

/** @deprecated discrete magnets replaced by continuous placement */
export function nearestMapSideDockAnchor(
  pointX: number,
  pointY: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0,
  exclude?: ReadonlySet<MapSideDockAnchor> | readonly MapSideDockAnchor[],
): MapSideDockAnchor {
  const blocked =
    exclude == null
      ? null
      : exclude instanceof Set
        ? exclude
        : new Set(exclude);
  const side = pointX < viewportWidth / 2 ? "left" : "right";
  const band =
    pointY < viewportHeight * 0.33
      ? "top"
      : pointY > viewportHeight * 0.66
        ? "bottom"
        : "mid";
  const candidate = `${band}-${side}` as MapSideDockAnchor;
  if (!blocked?.has(candidate)) {
    return candidate;
  }
  for (const anchor of MAP_SIDE_DOCK_ANCHORS) {
    if (!blocked.has(anchor)) {
      return anchor;
    }
  }
  return "bottom-right";
}

/** Phone session tool dock placement (shared store with nav). */
export function useMapSideDockSide(): {
  placement: MapChromeDockPlacement;
  setPlacement: (placement: MapChromeDockPlacement) => void;
  /** @deprecated use placement */
  anchor: MapSideDockAnchor;
  /** @deprecated use setPlacement */
  setAnchor: (anchor: MapSideDockAnchor) => void;
  side: "left" | "right";
  setSide: (side: "left" | "right") => void;
} {
  const [placement, setPlacementState] = useState<MapChromeDockPlacement>(
    () => readMapChromeDocksState().side,
  );

  useEffect(() => {
    syncMapSideDockDataset(placement);
    const sync = () => setPlacementState(readMapChromeDocksState().side);
    window.addEventListener(MAP_CHROME_DOCKS_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MAP_CHROME_DOCKS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [placement]);

  const setPlacement = useCallback((next: MapChromeDockPlacement) => {
    const state = readMapChromeDocksState();
    writeMapChromeDocksState({ ...state, side: next });
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

  const setSide = useCallback(
    (side: "left" | "right") => {
      setPlacement({ ...placement, side });
    },
    [placement, setPlacement],
  );

  return {
    placement,
    setPlacement,
    anchor: legacyAnchorFromPlacement(placement),
    setAnchor,
    side: placement.side,
    setSide,
  };
}
