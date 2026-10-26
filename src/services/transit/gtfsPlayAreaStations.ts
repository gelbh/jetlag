import type { BoundingBox } from "../../domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "../../domain/map/annotations";
import type { TransitRouteFilter } from "../../domain/map/transit";
import type { TransitStation } from "../../domain/session/hiding/hidingZone";
import type { GtfsBundleStop } from "./gtfsBundle";
import {
  filterGtfsStopsByMode,
  filterGtfsStopsForBoundingBox,
  filterGtfsStopsForGameArea,
  gtfsStopsToMatchingFeatures,
  gtfsStopsToTransitStations,
  loadGtfsBundle,
} from "./gtfsRouteGraph";
import { resolveTransitMetroId } from "./transitCatalog";

export type GtfsStationQuery = {
  transitMetroId?: string | null;
  transitStationFilter?: TransitRouteFilter | null;
};

function resolveFilter(query?: GtfsStationQuery): TransitRouteFilter {
  return query?.transitStationFilter ?? "all";
}

async function loadBundleForQuery(
  gameArea: GameArea,
  query?: GtfsStationQuery,
): Promise<Awaited<ReturnType<typeof loadGtfsBundle>>> {
  const metroId = resolveTransitMetroId(query?.transitMetroId, gameArea);
  if (!metroId) {
    return null;
  }
  return loadGtfsBundle(metroId);
}

function applyModeFilter(
  stops: readonly GtfsBundleStop[],
  bundle: NonNullable<Awaited<ReturnType<typeof loadGtfsBundle>>>,
  query?: GtfsStationQuery,
): GtfsBundleStop[] {
  return filterGtfsStopsByMode(stops, bundle, resolveFilter(query));
}

export async function fetchGtfsMatchingStationsForPlayArea(
  gameArea: GameArea,
  query?: GtfsStationQuery,
): Promise<ReturnType<typeof gtfsStopsToMatchingFeatures> | null> {
  const bundle = await loadBundleForQuery(gameArea, query);
  if (!bundle) {
    return null;
  }
  const stops = applyModeFilter(filterGtfsStopsForGameArea(bundle, gameArea), bundle, query);
  // Empty after filter: no GTFS authority → callers fall through to Overpass.
  if (stops.length === 0) {
    return null;
  }
  return gtfsStopsToMatchingFeatures(stops, gameArea);
}

export async function fetchGtfsHidingZoneStations(
  gameArea: GameArea,
  bbox: BoundingBox,
  query?: GtfsStationQuery,
): Promise<TransitStation[] | null> {
  const bundle = await loadBundleForQuery(gameArea, query);
  if (!bundle) {
    return null;
  }
  const stops = applyModeFilter(filterGtfsStopsForBoundingBox(bundle, bbox), bundle, query);
  // Empty array is authoritative when a mode filter is set (do not Overpass-union other modes).
  return gtfsStopsToTransitStations(stops, gameArea);
}

export async function fetchGtfsMeasuringStationsForPlayArea(
  gameArea: GameArea,
  query?: GtfsStationQuery,
): Promise<Array<{ id: string; name: string; point: [number, number] }> | null> {
  const bundle = await loadBundleForQuery(gameArea, query);
  if (!bundle) {
    return null;
  }
  const stops = applyModeFilter(filterGtfsStopsForGameArea(bundle, gameArea), bundle, query);
  if (stops.length === 0) {
    return null;
  }
  return gtfsStopsToTransitStations(stops, gameArea).map((stop) => ({
    id: stop.id,
    name: stop.name,
    point: [stop.lat, stop.lng] as [number, number],
  }));
}
