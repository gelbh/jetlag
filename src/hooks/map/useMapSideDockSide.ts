import { useCallback, useEffect, useState } from "react";

/**
 * Side snap anchors: top / mid / bottom on left and right.
 * Bottom sits above the hunt dock with extra clearance.
 */
export type MapSideDockAnchor =
  | "top-right"
  | "mid-right"
  | "bottom-right"
  | "top-left"
  | "mid-left"
  | "bottom-left";

export const MAP_SIDE_DOCK_STORAGE_KEY = "jl.mapChrome.sideDock";
const CHANGE_EVENT = "jl:map-side-dock";

export const MAP_SIDE_DOCK_ANCHORS: readonly MapSideDockAnchor[] = [
  "top-right",
  "mid-right",
  "bottom-right",
  "top-left",
  "mid-left",
  "bottom-left",
] as const;

function isAnchor(value: string | null | undefined): value is MapSideDockAnchor {
  return (MAP_SIDE_DOCK_ANCHORS as readonly string[]).includes(value ?? "");
}

/** Migrate Wave-2 L/R and 4-corner keys to the 6-slot grid. */
function normalizeStored(raw: string | null): MapSideDockAnchor {
  if (isAnchor(raw)) {
    return raw;
  }
  if (raw === "left") {
    return "bottom-left";
  }
  if (raw === "right") {
    return "bottom-right";
  }
  return "bottom-right";
}

function readAnchor(): MapSideDockAnchor {
  try {
    return normalizeStored(localStorage.getItem(MAP_SIDE_DOCK_STORAGE_KEY));
  } catch {
    return "bottom-right";
  }
}

function writeAnchor(anchor: MapSideDockAnchor): void {
  try {
    localStorage.setItem(MAP_SIDE_DOCK_STORAGE_KEY, anchor);
  } catch {
    // ignore
  }
  if (typeof document !== "undefined") {
    document.documentElement.dataset.mapSideDock = anchor;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function syncMapSideDockDataset(
  anchor: MapSideDockAnchor = readAnchor(),
): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.mapSideDock = anchor;
}

export function mapSideDockIsLeft(anchor: MapSideDockAnchor): boolean {
  return (
    anchor === "bottom-left" ||
    anchor === "mid-left" ||
    anchor === "top-left"
  );
}

export function mapSideDockIsTop(anchor: MapSideDockAnchor): boolean {
  return anchor === "top-left" || anchor === "top-right";
}

/**
 * Nearest side snap slot to a viewport point (pointer / finger on release).
 * Magnets sit at resting slot centers so top is below the status island, not y=0.
 */
export function nearestMapSideDockAnchor(
  pointX: number,
  pointY: number,
  viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0,
  viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0,
): MapSideDockAnchor {
  // Approximate resting centers (matches CSS top/mid/bottom slots).
  const topY = Math.min(140, viewportHeight * 0.22);
  const midY = viewportHeight / 2;
  const bottomY = Math.max(midY + 1, viewportHeight - Math.min(160, viewportHeight * 0.22));
  const points: Record<MapSideDockAnchor, { x: number; y: number }> = {
    "top-left": { x: 0, y: topY },
    "mid-left": { x: 0, y: midY },
    "bottom-left": { x: 0, y: bottomY },
    "top-right": { x: viewportWidth, y: topY },
    "mid-right": { x: viewportWidth, y: midY },
    "bottom-right": { x: viewportWidth, y: bottomY },
  };
  let best: MapSideDockAnchor = "bottom-right";
  let bestDist = Number.POSITIVE_INFINITY;
  for (const anchor of MAP_SIDE_DOCK_ANCHORS) {
    const point = points[anchor];
    const dist =
      (pointX - point.x) * (pointX - point.x) +
      (pointY - point.y) * (pointY - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = anchor;
    }
  }
  return best;
}

export function cycleMapSideDockAnchor(
  anchor: MapSideDockAnchor,
): MapSideDockAnchor {
  const order = MAP_SIDE_DOCK_ANCHORS;
  const index = order.indexOf(anchor);
  return order[(index + 1) % order.length] ?? "bottom-right";
}

/** Phone side-stack slot: persists and mirrors onto `html[data-map-side-dock]`. */
export function useMapSideDockSide(): {
  anchor: MapSideDockAnchor;
  setAnchor: (anchor: MapSideDockAnchor) => void;
  /** @deprecated use anchor / setAnchor */
  side: "left" | "right";
  /** @deprecated use setAnchor */
  setSide: (side: "left" | "right") => void;
} {
  const [anchor, setAnchorState] = useState<MapSideDockAnchor>(() =>
    readAnchor(),
  );

  useEffect(() => {
    syncMapSideDockDataset(anchor);
    const sync = () => setAnchorState(readAnchor());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [anchor]);

  const setAnchor = useCallback((next: MapSideDockAnchor) => {
    writeAnchor(next);
    setAnchorState(next);
  }, []);

  const setSide = useCallback(
    (side: "left" | "right") => {
      setAnchor(side === "left" ? "bottom-left" : "bottom-right");
    },
    [setAnchor],
  );

  return {
    anchor,
    setAnchor,
    side: mapSideDockIsLeft(anchor) ? "left" : "right",
    setSide,
  };
}
