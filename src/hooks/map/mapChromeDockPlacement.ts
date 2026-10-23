export type MapChromeDockId = "side" | "nav";
export type MapChromeDockSide = "left" | "right";

export type MapChromeDockPlacement = {
  side: MapChromeDockSide;
  topRatio: number;
};

export type MapChromeDocksState = {
  side: MapChromeDockPlacement;
  nav: MapChromeDockPlacement;
};

export const MAP_CHROME_DOCKS_STORAGE_KEY = "jl.mapChrome.docks";
export const MAP_CHROME_DOCKS_CHANGE_EVENT = "jl:map-chrome-docks";

export const MAP_SIDE_DOCK_STORAGE_KEY = "jl.mapChrome.sideDock";
export const MAP_NAV_DOCK_STORAGE_KEY = "jl.mapChrome.navDock";

const PEER_GAP_PX = 14;
const FLOAT_GAP_PX = 12;
const STATUS_ISLAND_PX = 44;
const HUNT_DOCK_PX = 52;
export const SIDE_DOCK_CLEARANCE_PX = 16;

export const DEFAULT_SIDE_PLACEMENT: MapChromeDockPlacement = {
  side: "right",
  topRatio: 0.72,
};

export const DEFAULT_NAV_PLACEMENT: MapChromeDockPlacement = {
  side: "left",
  topRatio: 0.72,
};

const LEGACY_ANCHORS = [
  "top-right",
  "mid-right",
  "bottom-right",
  "top-left",
  "mid-left",
  "bottom-left",
] as const;

export type MapSideDockAnchor = (typeof LEGACY_ANCHORS)[number];

function isLegacyAnchor(value: string | null | undefined): value is MapSideDockAnchor {
  return (LEGACY_ANCHORS as readonly string[]).includes(value ?? "");
}

export function placementFromLegacyAnchor(
  anchor: string | null | undefined,
  fallback: MapChromeDockPlacement,
): MapChromeDockPlacement {
  if (anchor === "left") {
    return { side: "left", topRatio: 0.72 };
  }
  if (anchor === "right") {
    return { side: "right", topRatio: 0.72 };
  }
  if (!isLegacyAnchor(anchor)) {
    return fallback;
  }
  const side: MapChromeDockSide = anchor.endsWith("left") ? "left" : "right";
  const topRatio = anchor.startsWith("top") ? 0.08 : anchor.startsWith("mid") ? 0.42 : 0.72;
  return { side, topRatio };
}

export function legacyAnchorFromPlacement(placement: MapChromeDockPlacement): MapSideDockAnchor {
  const band = placement.topRatio < 0.33 ? "top" : placement.topRatio > 0.66 ? "bottom" : "mid";
  return `${band}-${placement.side}` as MapSideDockAnchor;
}

export function usableVerticalBand(
  viewportHeight: number,
  safeAreaTopPx = 0,
): {
  minTop: number;
  maxBottom: number;
} {
  const minTop =
    Math.max(0, safeAreaTopPx) + FLOAT_GAP_PX + STATUS_ISLAND_PX + SIDE_DOCK_CLEARANCE_PX;
  const maxBottom = viewportHeight - (FLOAT_GAP_PX + HUNT_DOCK_PX + SIDE_DOCK_CLEARANCE_PX);
  return { minTop, maxBottom: Math.max(minTop + 48, maxBottom) };
}

/** Resolve safe-area top from computed env() inset (not the raw CSS token text). */
export function resolveSafeAreaTopPx(): number {
  if (typeof document === "undefined") {
    return 0;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;height:0;padding-top:var(--safe-area-top,0px)";
  document.documentElement.appendChild(probe);
  const px = Number.parseFloat(getComputedStyle(probe).paddingTop);
  probe.remove();
  return Number.isFinite(px) ? px : 0;
}

export function resolveUsableVerticalBand(viewportHeight: number): {
  minTop: number;
  maxBottom: number;
} {
  return usableVerticalBand(viewportHeight, resolveSafeAreaTopPx());
}

export function clampTopPx(
  top: number,
  height: number,
  viewportHeight: number,
  safeAreaTopPx = 0,
): number {
  const { minTop, maxBottom } = usableVerticalBand(viewportHeight, safeAreaTopPx);
  const maxTop = Math.max(minTop, maxBottom - height);
  return Math.min(maxTop, Math.max(minTop, top));
}

export function topRatioFromTopPx(
  top: number,
  height: number,
  viewportHeight: number,
  safeAreaTopPx = 0,
): number {
  const { minTop, maxBottom } = usableVerticalBand(viewportHeight, safeAreaTopPx);
  const span = Math.max(1, maxBottom - height - minTop);
  const clamped = clampTopPx(top, height, viewportHeight, safeAreaTopPx);
  return Math.min(1, Math.max(0, (clamped - minTop) / span));
}

export function topPxFromTopRatio(
  topRatio: number,
  height: number,
  viewportHeight: number,
  safeAreaTopPx = 0,
): number {
  const { minTop, maxBottom } = usableVerticalBand(viewportHeight, safeAreaTopPx);
  const span = Math.max(1, maxBottom - height - minTop);
  const ratio = Math.min(1, Math.max(0, topRatio));
  return clampTopPx(minTop + ratio * span, height, viewportHeight, safeAreaTopPx);
}

export function resolveStackedTops(input: {
  moverTop: number;
  moverHeight: number;
  peerTop: number;
  peerHeight: number;
  preferAbove: boolean;
  viewportHeight: number;
  gap?: number;
  safeAreaTopPx?: number;
}): { moverTop: number; peerTop: number } {
  const gap = input.gap ?? PEER_GAP_PX;
  const safeTop = input.safeAreaTopPx ?? 0;
  const { minTop, maxBottom } = usableVerticalBand(input.viewportHeight, safeTop);
  let moverTop = input.moverTop;
  let peerTop = input.peerTop;
  const { moverHeight, peerHeight } = input;

  const overlaps = moverTop < peerTop + peerHeight + gap && moverTop + moverHeight > peerTop - gap;

  if (!overlaps) {
    return {
      moverTop: clampTopPx(moverTop, moverHeight, input.viewportHeight, safeTop),
      peerTop: clampTopPx(peerTop, peerHeight, input.viewportHeight, safeTop),
    };
  }

  if (input.preferAbove) {
    moverTop = peerTop - gap - moverHeight;
    if (moverTop < minTop) {
      moverTop = minTop;
      peerTop = moverTop + moverHeight + gap;
      if (peerTop + peerHeight > maxBottom) {
        const total = moverHeight + gap + peerHeight;
        const start = Math.max(
          minTop,
          Math.min(maxBottom - total, (minTop + maxBottom - total) / 2),
        );
        moverTop = start;
        peerTop = start + moverHeight + gap;
      }
    }
  } else {
    moverTop = peerTop + peerHeight + gap;
    if (moverTop + moverHeight > maxBottom) {
      moverTop = maxBottom - moverHeight;
      peerTop = moverTop - gap - peerHeight;
      if (peerTop < minTop) {
        const total = moverHeight + gap + peerHeight;
        const start = Math.max(
          minTop,
          Math.min(maxBottom - total, (minTop + maxBottom - total) / 2),
        );
        peerTop = start;
        moverTop = start + peerHeight + gap;
      }
    }
  }

  return {
    moverTop: clampTopPx(moverTop, moverHeight, input.viewportHeight, safeTop),
    peerTop: clampTopPx(peerTop, peerHeight, input.viewportHeight, safeTop),
  };
}

export function sideFromPointX(pointX: number, viewportWidth: number): MapChromeDockSide {
  return pointX < viewportWidth / 2 ? "left" : "right";
}

function parsePlacement(value: unknown, fallback: MapChromeDockPlacement): MapChromeDockPlacement {
  if (value && typeof value === "object" && "side" in value && "topRatio" in value) {
    const side = (value as MapChromeDockPlacement).side;
    const topRatio = Number((value as MapChromeDockPlacement).topRatio);
    if ((side === "left" || side === "right") && Number.isFinite(topRatio)) {
      return {
        side,
        topRatio: Math.min(1, Math.max(0, topRatio)),
      };
    }
  }
  return fallback;
}

export function readMapChromeDocksState(): MapChromeDocksState {
  try {
    const raw = localStorage.getItem(MAP_CHROME_DOCKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MapChromeDocksState>;
      return {
        side: parsePlacement(parsed.side, DEFAULT_SIDE_PLACEMENT),
        nav: parsePlacement(parsed.nav, DEFAULT_NAV_PLACEMENT),
      };
    }
  } catch {}

  let side = DEFAULT_SIDE_PLACEMENT;
  let nav = DEFAULT_NAV_PLACEMENT;
  try {
    side = placementFromLegacyAnchor(
      localStorage.getItem(MAP_SIDE_DOCK_STORAGE_KEY),
      DEFAULT_SIDE_PLACEMENT,
    );
    nav = placementFromLegacyAnchor(
      localStorage.getItem(MAP_NAV_DOCK_STORAGE_KEY),
      DEFAULT_NAV_PLACEMENT,
    );
  } catch {}
  return { side, nav };
}

export function writeMapChromeDocksState(state: MapChromeDocksState): void {
  try {
    localStorage.setItem(MAP_CHROME_DOCKS_STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(MAP_SIDE_DOCK_STORAGE_KEY, legacyAnchorFromPlacement(state.side));
    localStorage.setItem(MAP_NAV_DOCK_STORAGE_KEY, legacyAnchorFromPlacement(state.nav));
  } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.dataset.mapSideDock = legacyAnchorFromPlacement(state.side);
    document.documentElement.dataset.mapNavDock = legacyAnchorFromPlacement(state.nav);
  }
  window.dispatchEvent(new Event(MAP_CHROME_DOCKS_CHANGE_EVENT));
}

export function syncMapSideDockDataset(
  placement: MapChromeDockPlacement = readMapChromeDocksState().side,
): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.mapSideDock = legacyAnchorFromPlacement(placement);
}

export function syncMapNavDockDataset(
  placement: MapChromeDockPlacement = readMapChromeDocksState().nav,
): void {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.mapNavDock = legacyAnchorFromPlacement(placement);
}

/** @deprecated migrate callers to placement APIs */
export function normalizeStoredAnchor(
  raw: string | null,
  fallback: MapSideDockAnchor = "bottom-right",
): MapSideDockAnchor {
  return legacyAnchorFromPlacement(
    placementFromLegacyAnchor(raw, placementFromLegacyAnchor(fallback, DEFAULT_SIDE_PLACEMENT)),
  );
}

export function mapSideDockIsLeft(
  anchorOrSide: MapSideDockAnchor | MapChromeDockPlacement | "left" | "right",
): boolean {
  if (anchorOrSide === "left" || anchorOrSide === "right") {
    return anchorOrSide === "left";
  }
  if (typeof anchorOrSide === "object") {
    return anchorOrSide.side === "left";
  }
  return anchorOrSide.endsWith("left");
}
