import type { LatLngTuple } from "../geometry/gameArea/geometry";

export const TRANSIT_ROUTE_MODES = [
  "rail",
  "metro",
  "tram",
  "bus",
  "ferry",
  "funicular",
  "other",
] as const;

export type TransitRouteMode = (typeof TRANSIT_ROUTE_MODES)[number];

export type TransitRouteFilter = "all" | TransitRouteMode;

/** Session filter: all modes, or a non-empty set (OR). Never empty array. */
export type TransitStationFilter = "all" | readonly TransitRouteMode[];

const TRANSIT_ROUTE_MODE_SET = new Set<string>(TRANSIT_ROUTE_MODES);

const MODE_SORT_INDEX = new Map<TransitRouteMode, number>(
  TRANSIT_ROUTE_MODES.map((mode, index) => [mode, index]),
);

function isTransitRouteMode(value: unknown): value is TransitRouteMode {
  return typeof value === "string" && TRANSIT_ROUTE_MODE_SET.has(value);
}

function sortTransitRouteModes(modes: Iterable<TransitRouteMode>): TransitRouteMode[] {
  return [...modes].sort((a, b) => (MODE_SORT_INDEX.get(a) ?? 0) - (MODE_SORT_INDEX.get(b) ?? 0));
}

/**
 * Normalize wire/UI filter input to `TransitStationFilter`.
 * Unknown tokens and empty selections become `"all"` (deserialize-safe).
 * Legacy single-mode strings become a one-element array.
 */
export function normalizeTransitStationFilter(raw: unknown): TransitStationFilter {
  if (raw === undefined || raw === null || raw === "all") {
    return "all";
  }
  if (typeof raw === "string") {
    return isTransitRouteMode(raw) ? [raw] : "all";
  }
  if (!Array.isArray(raw)) {
    return "all";
  }
  const unique = new Set<TransitRouteMode>();
  for (const entry of raw) {
    if (isTransitRouteMode(entry)) {
      unique.add(entry);
    }
  }
  if (unique.size === 0) {
    return "all";
  }
  return sortTransitRouteModes(unique);
}

export function isTransitStationFilterAll(filter: TransitStationFilter): boolean {
  return filter === "all";
}

/**
 * Toggle All (exclusive) or a mode chip for the session station filter.
 * Last mode off returns `"all"`. Modes are OR-selected and sorted.
 */
export function toggleTransitStationMode(
  current: TransitStationFilter,
  mode: TransitRouteMode | "all",
): TransitStationFilter {
  if (mode === "all") {
    return "all";
  }
  const set = new Set(current === "all" ? [] : current);
  if (set.has(mode)) {
    set.delete(mode);
  } else {
    set.add(mode);
  }
  if (set.size === 0) {
    return "all";
  }
  return normalizeTransitStationFilter([...set]) as TransitRouteMode[];
}

/** Stop matches when filter is all, or any stop mode intersects the selected modes. */
export function stationModesMatchFilter(
  stopModes: ReadonlySet<TransitRouteMode>,
  filter: TransitStationFilter,
): boolean {
  if (filter === "all") {
    return true;
  }
  for (const mode of filter) {
    if (stopModes.has(mode)) {
      return true;
    }
  }
  return false;
}

export interface TransitBoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface TransitMetro {
  id: string;
  label: string;
  center: LatLngTuple;
  radiusKm: number;
  transitlandFeed?: string;
  transitlandRtFeed?: string;
  gtfsRtVehicleUrl?: string;
  vehiclesProxyMetro?: string;
}

export interface TransitStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mode: TransitRouteMode;
}

export interface TransitRouteLine {
  id: string;
  name: string;
  mode: TransitRouteMode;
  ref?: string;
  positions: LatLngTuple[];
}

export interface TransitVehicle {
  id: string;
  label: string;
  lat: number;
  lng: number;
  bearing?: number;
  routeRef?: string;
  mode: TransitRouteMode;
  updatedAt: string;
}

export interface TransitStaticData {
  stops: TransitStop[];
  routes: TransitRouteLine[];
  fetchedAt: string;
}

export interface TransitRealtimeSnapshot {
  vehicles: TransitVehicle[];
  fetchedAt: string;
  source: "proxy" | "transitland" | "none";
  message?: string;
}
