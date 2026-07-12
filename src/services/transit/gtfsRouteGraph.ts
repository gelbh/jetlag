import KDBush from "kdbush";
import * as geokdbush from "geokdbush";
import type { GameArea } from "../../domain/map/annotations";
import {
  distanceBetweenPoints,
  gameAreaToBoundingBox,
  isPointInGameArea,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import type { BoundingBox } from "../../domain/geometry/gameAreaBounds";
import type { GtfsBundleStop, GtfsStaticBundle } from "./gtfsBundle";
import { GTFS_BUNDLE_MANIFEST_PATH } from "./gtfsBundle";

const bundleCache = new Map<string, GtfsStaticBundle>();
const stopsByIdCache = new WeakMap<GtfsStaticBundle, Map<string, GtfsBundleStop>>();
const stopSpatialIndexCache = new Map<string, GtfsStopSpatialIndex>();
let manifestCache: Map<string, string> | null = null;

const LINEAR_NEAREST_STOP_THRESHOLD = 100;

interface GtfsStopSpatialIndex {
  stops: GtfsBundleStop[];
  index: KDBush;
}

function stopInBoundingBox(stop: GtfsBundleStop, bbox: BoundingBox): boolean {
  return (
    stop.lat >= bbox.south &&
    stop.lat <= bbox.north &&
    stop.lng >= bbox.west &&
    stop.lng <= bbox.east
  );
}

function getStopsById(bundle: GtfsStaticBundle): Map<string, GtfsBundleStop> {
  let stopsById = stopsByIdCache.get(bundle);
  if (!stopsById) {
    stopsById = new Map(bundle.stops.map((stop) => [stop.id, stop]));
    stopsByIdCache.set(bundle, stopsById);
  }
  return stopsById;
}

function gameAreaBboxCacheKey(bbox: BoundingBox): string {
  return `${bbox.south.toFixed(5)}|${bbox.west.toFixed(5)}|${bbox.north.toFixed(5)}|${bbox.east.toFixed(5)}`;
}

function buildStopSpatialIndex(stops: GtfsBundleStop[]): GtfsStopSpatialIndex {
  const index = new KDBush(stops.length);
  for (const stop of stops) {
    index.add(stop.lng, stop.lat);
  }
  index.finish();
  return { stops, index };
}

function getStopSpatialIndex(
  metroId: string,
  bundle: GtfsStaticBundle,
  gameArea: GameArea,
): GtfsStopSpatialIndex {
  const bbox = gameAreaToBoundingBox(gameArea);
  const cacheKey = `${metroId}|${gameAreaBboxCacheKey(bbox)}`;
  const cached = stopSpatialIndexCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const stops = filterGtfsStopsForGameArea(bundle, gameArea);
  const spatialIndex = buildStopSpatialIndex(stops);
  stopSpatialIndexCache.set(cacheKey, spatialIndex);
  return spatialIndex;
}

export function stationIdentity(stopId: string, bundle: GtfsStaticBundle): string {
  const stop = getStopsById(bundle).get(stopId);
  return stop?.parentStationId ?? stopId;
}

export function routeIdsForStop(
  stopId: string,
  bundle: GtfsStaticBundle,
): string[] {
  return bundle.stopRouteIds[stopId] ?? [];
}

export function nearestGtfsStop(
  point: LatLngTuple,
  stops: readonly GtfsBundleStop[],
): (GtfsBundleStop & { distanceMeters: number }) | null {
  let nearest: (GtfsBundleStop & { distanceMeters: number }) | null = null;

  for (const stop of stops) {
    const distanceMeters = distanceBetweenPoints(point, [stop.lat, stop.lng]);
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { ...stop, distanceMeters };
    }
  }

  return nearest;
}

function nearestGtfsStopFromSpatialIndex(
  point: LatLngTuple,
  spatialIndex: GtfsStopSpatialIndex,
): (GtfsBundleStop & { distanceMeters: number }) | null {
  const [lat, lng] = point;
  const nearestIds = geokdbush.around(spatialIndex.index, lng, lat, 1);
  const nearestId = nearestIds[0];
  if (nearestId === undefined) {
    return null;
  }

  const stop = spatialIndex.stops[nearestId];
  if (!stop) {
    return null;
  }

  return {
    ...stop,
    distanceMeters: distanceBetweenPoints(point, [stop.lat, stop.lng]),
  };
}

export function nearestGtfsStopInGameArea(
  point: LatLngTuple,
  bundle: GtfsStaticBundle,
  gameArea: GameArea,
  metroId = bundle.metroId,
): (GtfsBundleStop & { distanceMeters: number }) | null {
  const spatialIndex = getStopSpatialIndex(metroId, bundle, gameArea);
  if (spatialIndex.stops.length === 0) {
    return null;
  }

  if (spatialIndex.stops.length <= LINEAR_NEAREST_STOP_THRESHOLD) {
    return nearestGtfsStop(point, spatialIndex.stops);
  }

  return nearestGtfsStopFromSpatialIndex(point, spatialIndex);
}

export function gtfsStopsShareStationOrRoute(
  seekerStopId: string,
  hiderStopId: string,
  bundle: GtfsStaticBundle,
): boolean {
  if (seekerStopId === hiderStopId) {
    return true;
  }

  if (stationIdentity(seekerStopId, bundle) === stationIdentity(hiderStopId, bundle)) {
    return true;
  }

  const seekerRoutes = new Set(routeIdsForStop(seekerStopId, bundle));
  for (const routeId of routeIdsForStop(hiderStopId, bundle)) {
    if (seekerRoutes.has(routeId)) {
      return true;
    }
  }

  return false;
}

export function gtfsStopsToMatchingFeatures(
  stops: readonly GtfsBundleStop[],
  gameArea: GameArea,
): Array<{ id: string; name: string; point: LatLngTuple; inPlayArea?: boolean }> {
  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    point: [stop.lat, stop.lng] as LatLngTuple,
    inPlayArea: isPointInGameArea([stop.lat, stop.lng], gameArea),
  }));
}

export function filterGtfsStopsForGameArea(
  bundle: GtfsStaticBundle,
  gameArea: GameArea,
): GtfsBundleStop[] {
  const bbox = gameAreaToBoundingBox(gameArea);
  return bundle.stops.filter((stop) => stopInBoundingBox(stop, bbox));
}

async function loadManifest(): Promise<Map<string, string>> {
  if (manifestCache) {
    return manifestCache;
  }

  const response = await fetch(GTFS_BUNDLE_MANIFEST_PATH);
  if (!response.ok) {
    manifestCache = new Map();
    return manifestCache;
  }

  const payload = (await response.json()) as {
    metros?: Array<{ id: string; bundlePath: string }>;
  };

  manifestCache = new Map(
    (payload.metros ?? []).map((entry) => [entry.id, entry.bundlePath]),
  );
  return manifestCache;
}

export async function loadGtfsBundle(
  metroId: string,
): Promise<GtfsStaticBundle | null> {
  const cached = bundleCache.get(metroId);
  if (cached) {
    return cached;
  }

  const manifest = await loadManifest();
  const bundlePath = manifest.get(metroId);
  if (!bundlePath) {
    return null;
  }

  const response = await fetch(bundlePath);
  if (!response.ok) {
    return null;
  }

  const bundle = (await response.json()) as GtfsStaticBundle;
  bundleCache.set(metroId, bundle);
  getStopsById(bundle);
  return bundle;
}

export function clearGtfsBundleCacheForTests(): void {
  bundleCache.clear();
  stopSpatialIndexCache.clear();
  manifestCache = null;
}

export async function resolveTransitLineMatch(
  seekerPoint: LatLngTuple,
  hiderPoint: LatLngTuple,
  bundle: GtfsStaticBundle,
  gameArea: GameArea,
): Promise<boolean> {
  const seekerStop = nearestGtfsStopInGameArea(
    seekerPoint,
    bundle,
    gameArea,
    bundle.metroId,
  );
  const hiderStop = nearestGtfsStopInGameArea(
    hiderPoint,
    bundle,
    gameArea,
    bundle.metroId,
  );

  if (!seekerStop || !hiderStop) {
    return false;
  }

  return gtfsStopsShareStationOrRoute(seekerStop.id, hiderStop.id, bundle);
}
