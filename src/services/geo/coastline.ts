import type { Feature, LineString } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import {
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
  type LatLngTuple,
  type PreparedLinearSegments,
} from "../../domain/geometry/geometry";
import {
  coastlineSegmentsCacheKey,
  getOrFetchCached,
  readCachedMemoryEntry,
} from "./geographicFeatureCache";
import { queryOverpass } from "../core/overpassClient";
import {
  formatOverpassBboxFromGameArea,
  overpassQueryTemplate,
} from "../overpass/query";

export function buildCoastlineQuery(gameArea: GameArea): string {
  const bbox = formatOverpassBboxFromGameArea(gameArea);

  return overpassQueryTemplate(`
    way["natural"="coastline"](${bbox});
    out geom;
  `);
}

function wayToLineString(
  nodes: Array<{ lat: number; lon: number }>,
): Feature<LineString> | null {
  if (nodes.length < 2) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: nodes.map((node) => [node.lon, node.lat]),
    },
  };
}

async function fetchCoastlineSegmentsFromOverpass(
  gameArea: GameArea,
): Promise<Feature<LineString>[]> {
  const payload = await queryOverpass<{
    elements: Array<{
      type: string;
      geometry?: Array<{ lat: number; lon: number }>;
    }>;
  }>(buildCoastlineQuery(gameArea));

  return payload.elements
    .filter((element) => element.type === "way" && element.geometry)
    .map((element) => wayToLineString(element.geometry ?? []))
    .filter((segment): segment is Feature<LineString> => segment !== null);
}

export async function fetchCoastlineSegments(
  gameArea: GameArea,
): Promise<Feature<LineString>[]> {
  const prepared = await fetchPreparedCoastlineSegments(gameArea);
  return prepared.segments;
}

export async function fetchPreparedCoastlineSegments(
  gameArea: GameArea,
): Promise<PreparedLinearSegments> {
  return getOrFetchCached(coastlineSegmentsCacheKey(gameArea), async () => {
    const segments = await fetchCoastlineSegmentsFromOverpass(gameArea);
    return prepareMeasuringLineSegments(segments, gameArea);
  });
}

export function getCachedPreparedCoastlineSegments(
  gameArea: GameArea,
): PreparedLinearSegments | undefined {
  return readCachedMemoryEntry<PreparedLinearSegments>(
    coastlineSegmentsCacheKey(gameArea),
  );
}

export function resolveCoastlineContextFromCache(
  seeker: LatLngTuple,
  gameArea: GameArea,
): {
  coastPoint: LatLngTuple;
  distanceMeters: number;
  segmentCount: number;
} | null {
  const prepared = getCachedPreparedCoastlineSegments(gameArea);
  if (!prepared) {
    return null;
  }

  const nearest = nearestPointToCoastlines(seeker, prepared.segments, prepared);
  if (!nearest) {
    return null;
  }

  return {
    coastPoint: nearest.point,
    distanceMeters: nearest.distanceMeters,
    segmentCount: prepared.segments.length,
  };
}

export async function loadCoastlineContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
): Promise<{
  coastPoint: LatLngTuple;
  distanceMeters: number;
  segmentCount: number;
} | null> {
  const cached = resolveCoastlineContextFromCache(seeker, gameArea);
  if (cached) {
    return cached;
  }

  const prepared = await fetchPreparedCoastlineSegments(gameArea);
  const nearest = nearestPointToCoastlines(seeker, prepared.segments, prepared);

  if (!nearest) {
    return null;
  }

  return {
    coastPoint: nearest.point,
    distanceMeters: nearest.distanceMeters,
    segmentCount: prepared.segments.length,
  };
}

export async function findNearestCoastPoint(
  seeker: LatLngTuple,
  gameArea: GameArea,
): Promise<{
  coastPoint: LatLngTuple;
  distanceMeters: number;
  segmentCount: number;
} | null> {
  const context = await loadCoastlineContext(seeker, gameArea);
  if (!context) {
    return null;
  }

  return {
    coastPoint: context.coastPoint,
    distanceMeters: context.distanceMeters,
    segmentCount: context.segmentCount,
  };
}
