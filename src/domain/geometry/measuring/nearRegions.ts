import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import booleanIntersects from "@turf/boolean-intersects";
import turfCircle from "@turf/circle";
import turfDistance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";
import intersect from "@turf/intersect";
import turfLength from "@turf/length";
import nearestPointOnLine from "@turf/nearest-point-on-line";
import simplify from "@turf/simplify";
import Flatbush from "flatbush";
import { around as geoflatbushAround } from "geoflatbush";
import { unionPolygonFeatures } from "../masks/unionPolygonFeatures";
import type { GameArea } from "../../map/annotations";
import { dispatchGeodesicLineBuffer } from "./geodesicLineBuffer";
import { featureToGameAreaGeometry } from "../kernel/featureConvert";
import { shouldUseWasm } from "../kernel/kernelWasmReady";
import { dispatchNearRegionBatch } from "../kernel/nearRegionKernelRunner";
import { resolveClientMaskKernelMode } from "../kernel/resolveClientMaskKernelMode";
import {
  gameAreaFingerprint,
  gameAreaToFeature,
  gameAreaToPolygon,
  type LatLngTuple,
} from "../gameArea/geometryCore";
import { geodesicLineBuffer } from "../kernel/geodesicLineBuffer";

type SegmentBoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export interface PreparedLinearSegments {
  segments: Feature<LineString>[];
  boundingBoxes: SegmentBoundingBox[];
  spatialIndex: Flatbush | null;
}

const MIN_MEASURING_SEGMENT_LENGTH_METERS = 5;

function segmentBoundingBox(segment: Feature<LineString>): SegmentBoundingBox {
  const coordinates = segment.geometry.coordinates;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;

  for (const [lng, lat] of coordinates) {
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }

  return { south, west, north, east };
}

function bboxMinDistanceMeters(
  box: SegmentBoundingBox,
  point: LatLngTuple,
): number {
  const lat = point[0];
  const lng = point[1];
  const clampedLat = Math.min(Math.max(lat, box.south), box.north);
  const clampedLng = Math.min(Math.max(lng, box.west), box.east);
  return turfDistance(
    turfPoint([lng, lat]),
    turfPoint([clampedLng, clampedLat]),
    { units: "meters" },
  );
}

export function prepareMeasuringLineSegments(
  segments: Feature<LineString>[],
  gameArea: GameArea,
): PreparedLinearSegments {
  const gameFeature = gameAreaToFeature(gameArea);
  const preparedSegments: Feature<LineString>[] = [];

  for (const segment of segments) {
    if (!booleanIntersects(segment, gameFeature)) {
      continue;
    }

    const simplified = simplify(segment, {
      tolerance: 0.00005,
      highQuality: false,
    }) as Feature<LineString>;

    if (
      turfLength(simplified, { units: "meters" }) <
      MIN_MEASURING_SEGMENT_LENGTH_METERS
    ) {
      continue;
    }

    preparedSegments.push(simplified);
  }

  const boundingBoxes = preparedSegments.map(segmentBoundingBox);

  return {
    segments: preparedSegments,
    boundingBoxes,
    // Flatbush rejects a zero-item index; no-segment play areas (e.g. blocked
    // admin borders for a metro region pack) legitimately have none to index.
    spatialIndex:
      boundingBoxes.length > 0 ? buildSegmentSpatialIndex(boundingBoxes) : null,
  };
}

function buildSegmentSpatialIndex(boundingBoxes: SegmentBoundingBox[]): Flatbush {
  const index = new Flatbush(boundingBoxes.length);
  for (const box of boundingBoxes) {
    index.add(box.west, box.south, box.east, box.north);
  }
  index.finish();
  return index;
}

const COASTLINE_CANDIDATE_LIMIT = 32;

function candidateSegmentIndices(
  point: LatLngTuple,
  prepared: PreparedLinearSegments,
): number[] {
  const { segments, spatialIndex } = prepared;
  if (segments.length === 0 || !spatialIndex) {
    return [];
  }

  return geoflatbushAround(
    spatialIndex,
    point[1],
    point[0],
    Math.min(COASTLINE_CANDIDATE_LIMIT, segments.length),
  );
}

export function nearestPointToCoastlines(
  point: LatLngTuple,
  coastlines: Feature<LineString>[],
  prepared?: PreparedLinearSegments,
): { point: LatLngTuple; distanceMeters: number } | null {
  const segments = prepared?.segments ?? coastlines;
  const boundingBoxes =
    prepared?.boundingBoxes ?? segments.map(segmentBoundingBox);
  const seeker = turfPoint([point[1], point[0]]);
  let nearest: { point: LatLngTuple; distanceMeters: number } | null = null;

  const indices = prepared
    ? candidateSegmentIndices(point, prepared)
    : segments.map((_, index) => index);

  for (const index of indices) {
    const coastline = segments[index];
    const boundingBox = boundingBoxes[index];
    if (!coastline || !boundingBox) {
      continue;
    }

    const lowerBound = bboxMinDistanceMeters(boundingBox, point);
    if (nearest && lowerBound >= nearest.distanceMeters) {
      continue;
    }

    const nearestOnLine = nearestPointOnLine(coastline, seeker);
    const distanceMeters = turfDistance(seeker, nearestOnLine, {
      units: "meters",
    });
    const candidate: LatLngTuple = [
      nearestOnLine.geometry.coordinates[1],
      nearestOnLine.geometry.coordinates[0],
    ];

    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = { point: candidate, distanceMeters };
    }
  }

  return nearest;
}

const COASTLINE_NEAR_REGION_CACHE_MAX = 32;
const coastlineNearRegionCache = new Map<
  string,
  Feature<Polygon | MultiPolygon>
>();

function coastlineNearRegionCacheKey(
  gameArea: GameArea,
  distanceMeters: number,
  segmentCount: number,
  kernelMode: string = "ts",
): string {
  return `${gameAreaFingerprint(gameArea)}:${distanceMeters}:${segmentCount}:${kernelMode}`;
}

export function clearCoastlineNearRegionCacheForTests(): void {
  coastlineNearRegionCache.clear();
}

function getCachedCoastlineNearRegion(
  cacheKey: string,
): Feature<Polygon | MultiPolygon> | undefined {
  return coastlineNearRegionCache.get(cacheKey);
}

function setCachedCoastlineNearRegion(
  cacheKey: string,
  result: Feature<Polygon | MultiPolygon>,
): void {
  if (coastlineNearRegionCache.size >= COASTLINE_NEAR_REGION_CACHE_MAX) {
    const oldestKey = coastlineNearRegionCache.keys().next().value;
    if (oldestKey !== undefined) {
      coastlineNearRegionCache.delete(oldestKey);
    }
  }
  coastlineNearRegionCache.set(cacheKey, result);
}

export const COASTLINE_NEAR_REGION_YIELD_EVERY = 4;

let coastlineNearRegionYieldHook: (() => Promise<void>) | null = null;

function yieldToEventLoop(): Promise<void> {
  if (coastlineNearRegionYieldHook) {
    return coastlineNearRegionYieldHook();
  }
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export function setCoastlineNearRegionYieldHookForTests(
  hook: (() => Promise<void>) | null,
): void {
  coastlineNearRegionYieldHook = hook;
}

function combinePolygonFeatures(
  features: Feature<Polygon | MultiPolygon>[],
): Feature<Polygon | MultiPolygon> | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0];
  }

  const multiCoordinates: number[][][][] = [];

  for (const feature of features) {
    if (feature.geometry.type === "Polygon") {
      multiCoordinates.push(feature.geometry.coordinates);
      continue;
    }

    multiCoordinates.push(...feature.geometry.coordinates);
  }

  if (multiCoordinates.length === 0) {
    return null;
  }

  if (multiCoordinates.length === 1) {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: multiCoordinates[0],
      },
    };
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates: multiCoordinates,
    },
  };
}

function unionBufferedFeatures(
  features: Feature<Polygon | MultiPolygon>[],
): Feature<Polygon | MultiPolygon> | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0];
  }

  try {
    const united = unionPolygonFeatures(features);
    if (united) {
      return united;
    }
  } catch {
    // Fall back to a MultiPolygon shell; point-in-region semantics match union.
  }

  return combinePolygonFeatures(features);
}

function clipNearCoastToGameArea(
  nearCoast: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea);

  try {
    const clipped = intersect({
      type: "FeatureCollection",
      features: [gameFeature, nearCoast],
    });

    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      return clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    // Fall back to per-buffer clipping below.
  }

  return null;
}

function clipBufferedSegmentsToGameArea(
  bufferedFeatures: Feature<Polygon | MultiPolygon>[],
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea);
  const clippedParts: Feature<Polygon | MultiPolygon>[] = [];

  for (const buffered of bufferedFeatures) {
    try {
      const clipped = intersect({
        type: "FeatureCollection",
        features: [gameFeature, buffered],
      });

      if (
        clipped &&
        (clipped.geometry.type === "Polygon" ||
          clipped.geometry.type === "MultiPolygon")
      ) {
        clippedParts.push(clipped as Feature<Polygon | MultiPolygon>);
      }
    } catch {
      // Skip buffers that fail to clip cleanly.
    }
  }

  return combinePolygonFeatures(clippedParts);
}

async function buildCoastlineNearRegionWithBuffer(
  segments: Feature<LineString>[],
  distanceMeters: number,
  gameArea: GameArea,
  bufferLine: (
    segment: Feature<LineString>,
    meters: number,
  ) => Promise<Feature<Polygon | MultiPolygon> | null> | Feature<Polygon | MultiPolygon> | null,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  if (segments.length === 0 || distanceMeters <= 0) {
    return null;
  }

  const cacheKey = coastlineNearRegionCacheKey(
    gameArea,
    distanceMeters,
    segments.length,
    "async",
  );
  const cached = getCachedCoastlineNearRegion(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const bufferedFeatures: Feature<Polygon | MultiPolygon>[] = [];

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index]!;
      const buffered = await bufferLine(segment, distanceMeters);

      if (!buffered) {
        continue;
      }

      bufferedFeatures.push(buffered);

      if (
        (index + 1) % COASTLINE_NEAR_REGION_YIELD_EVERY === 0 &&
        index + 1 < segments.length
      ) {
        await yieldToEventLoop();
      }
    }

    if (bufferedFeatures.length === 0) {
      return null;
    }

    const nearCoast = unionBufferedFeatures(bufferedFeatures);
    if (!nearCoast) {
      return null;
    }

    const result =
      clipNearCoastToGameArea(nearCoast, gameArea) ??
      clipBufferedSegmentsToGameArea(bufferedFeatures, gameArea);

    if (!result) {
      return null;
    }

    setCachedCoastlineNearRegion(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

/** Sync TS path for tests/bootstrap. Prefer {@link buildCoastlineNearRegion}. */
export function buildCoastlineNearRegionTs(
  segments: Feature<LineString>[],
  distanceMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  // Sync wrapper: geodesicLineBuffer is sync; Promise.resolve unused.
  // Keep API sync for existing tests by inlining the sync buffer loop.
  if (segments.length === 0 || distanceMeters <= 0) {
    return null;
  }

  const cacheKey = coastlineNearRegionCacheKey(
    gameArea,
    distanceMeters,
    segments.length,
    "ts",
  );
  const cached = getCachedCoastlineNearRegion(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const bufferedFeatures: Feature<Polygon | MultiPolygon>[] = [];

    for (const segment of segments) {
      const buffered = geodesicLineBuffer(segment, distanceMeters);
      if (buffered) {
        bufferedFeatures.push(buffered);
      }
    }

    if (bufferedFeatures.length === 0) {
      return null;
    }

    const nearCoast = unionBufferedFeatures(bufferedFeatures);
    if (!nearCoast) {
      return null;
    }

    const result =
      clipNearCoastToGameArea(nearCoast, gameArea) ??
      clipBufferedSegmentsToGameArea(bufferedFeatures, gameArea);

    if (!result) {
      return null;
    }

    setCachedCoastlineNearRegion(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export async function buildCoastlineNearRegion(
  segments: Feature<LineString>[],
  distanceMeters: number,
  gameArea: GameArea,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const mode = resolveClientMaskKernelMode();
  if (shouldUseWasm(mode, "nearRegionBatch")) {
    const cacheKey = coastlineNearRegionCacheKey(
      gameArea,
      distanceMeters,
      segments.length,
      `batch:${mode}`,
    );
    const cached = getCachedCoastlineNearRegion(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await dispatchNearRegionBatch(
      {
        segments,
        distanceMeters,
        disks: [],
        gameArea: featureToGameAreaGeometry(gameAreaToFeature(gameArea)),
        // Sync runTs: dispatchKernel requires sync TS; WASM-fail skips cooperative yield.
        runTs: () =>
          buildCoastlineNearRegionTs(segments, distanceMeters, gameArea),
      },
      mode,
    );

    if (result) {
      setCachedCoastlineNearRegion(cacheKey, result);
    }
    return result;
  }

  return buildCoastlineNearRegionWithBuffer(
    segments,
    distanceMeters,
    gameArea,
    (segment, meters) =>
      dispatchGeodesicLineBuffer(segment, meters, undefined, mode),
  );
}

export function distanceBetweenPoints(
  from: LatLngTuple,
  to: LatLngTuple,
): number {
  return turfDistance(
    turfPoint([from[1], from[0]]),
    turfPoint([to[1], to[0]]),
    {
      units: "meters",
    },
  );
}

/** Match radar / elimination / hiding-zone disks — coarse steps undersize near chords. */
const NEAR_REGION_DISK_STEPS = 64;

export function buildLocationNearRegion(
  target: LatLngTuple,
  distanceMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (distanceMeters <= 0) {
    return null;
  }

  const buffered = turfCircle(turfPoint([target[1], target[0]]), distanceMeters / 1000, {
    steps: NEAR_REGION_DISK_STEPS,
    units: "kilometers",
  });

  if (
    !buffered ||
    (buffered.geometry.type !== "Polygon" &&
      buffered.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const gameFeature = gameAreaToPolygon(gameArea);
  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameFeature, buffered as Feature<Polygon | MultiPolygon>],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

/** Sync TS multi-place path for tests/overlays. Prefer {@link buildMultiPlaceNearRegion}. */
export function buildMultiPlaceNearRegionTs(
  places: readonly LatLngTuple[],
  distanceMeters: number,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  if (places.length === 0 || distanceMeters <= 0) {
    return null;
  }

  if (places.length === 1) {
    return buildLocationNearRegion(places[0], distanceMeters, gameArea);
  }

  const bufferedFeatures: Feature<Polygon | MultiPolygon>[] = [];

  for (const place of places) {
    const buffered = turfCircle(turfPoint([place[1], place[0]]), distanceMeters / 1000, {
      steps: NEAR_REGION_DISK_STEPS,
      units: "kilometers",
    });

    if (
      !buffered ||
      (buffered.geometry.type !== "Polygon" &&
        buffered.geometry.type !== "MultiPolygon")
    ) {
      continue;
    }

    bufferedFeatures.push(buffered as Feature<Polygon | MultiPolygon>);
  }

  if (bufferedFeatures.length === 0) {
    return null;
  }

  const nearRegion =
    bufferedFeatures.length === 1
      ? bufferedFeatures[0]
      : unionPolygonFeatures(bufferedFeatures);

  if (
    !nearRegion ||
    (nearRegion.geometry.type !== "Polygon" &&
      nearRegion.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const gameFeature = gameAreaToPolygon(gameArea);
  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameFeature, nearRegion],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

/** Union of equal-radius buffers around every site (e.g. all airports in the play area). */
export async function buildMultiPlaceNearRegion(
  places: readonly LatLngTuple[],
  distanceMeters: number,
  gameArea: GameArea,
): Promise<Feature<Polygon | MultiPolygon> | null> {
  const mode = resolveClientMaskKernelMode();
  if (shouldUseWasm(mode, "nearRegionBatch")) {
    return dispatchNearRegionBatch(
      {
        segments: [],
        distanceMeters: 0,
        disks: places.map((center) => ({
          center,
          radiusMeters: distanceMeters,
        })),
        gameArea: featureToGameAreaGeometry(gameAreaToFeature(gameArea)),
        runTs: () =>
          buildMultiPlaceNearRegionTs(places, distanceMeters, gameArea),
      },
      mode,
    );
  }

  return buildMultiPlaceNearRegionTs(places, distanceMeters, gameArea);
}
