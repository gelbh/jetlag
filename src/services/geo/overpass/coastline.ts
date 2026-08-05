import type { Feature, LineString } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
  type LatLngTuple,
  type PreparedLinearSegments,
} from "@/domain/geometry/gameArea/geometry";
import {
  coastlineSegmentsCacheKey,
  getOrFetchCached,
  readCachedMemoryEntry,
  writeCoastlineSegmentsCache,
} from "../cache";
import { queryOverpass } from "../../core/overpass/overpassClient";
import {
  formatOverpassBboxFromGameArea,
  overpassQueryTemplate,
} from "./query";
import {
  loadBundledCoastlinePack,
  mergeCoastlineSegments,
} from "./regionPackCoastline";

export interface FetchCoastlineOptions {
  regionPackId?: RegionPackId;
  onEnrich?: (prepared: PreparedLinearSegments) => void;
}

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

async function prepareMergedCoastlineSegments(
  gameArea: GameArea,
  bundledSegments: Feature<LineString>[],
): Promise<PreparedLinearSegments> {
  const overpassSegments = await fetchCoastlineSegmentsFromOverpass(gameArea);
  const segments = mergeCoastlineSegments(overpassSegments, bundledSegments);
  return prepareMeasuringLineSegments(segments, gameArea);
}

export async function fetchCoastlineSegments(
  gameArea: GameArea,
  options?: FetchCoastlineOptions,
): Promise<Feature<LineString>[]> {
  const prepared = await fetchPreparedCoastlineSegments(gameArea, options);
  return prepared.segments;
}

export async function fetchPreparedCoastlineSegments(
  gameArea: GameArea,
  options?: FetchCoastlineOptions,
): Promise<PreparedLinearSegments> {
  const pack = options?.regionPackId
    ? await loadBundledCoastlinePack(options.regionPackId)
    : null;

  if (pack?.source === "none") {
    const empty = prepareMeasuringLineSegments([], gameArea);
    await writeCoastlineSegmentsCache(gameArea, empty);
    return empty;
  }

  const bundledSegments = pack?.segments ?? [];

  if (bundledSegments.length > 0 && options?.onEnrich) {
    const prepared = prepareMeasuringLineSegments(bundledSegments, gameArea);
    await writeCoastlineSegmentsCache(gameArea, prepared);
    void prepareMergedCoastlineSegments(gameArea, bundledSegments)
      .then(async (merged) => {
        await writeCoastlineSegmentsCache(gameArea, merged);
        options.onEnrich?.(merged);
      })
      .catch(() => {
        // Soft-fail Overpass enrich; keep the pack result.
      });
    return prepared;
  }

  return getOrFetchCached(coastlineSegmentsCacheKey(gameArea), () =>
    prepareMergedCoastlineSegments(gameArea, bundledSegments),
  );
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
  options?: FetchCoastlineOptions,
): Promise<{
  coastPoint: LatLngTuple;
  distanceMeters: number;
  segmentCount: number;
} | null> {
  const cached = resolveCoastlineContextFromCache(seeker, gameArea);
  if (cached) {
    return cached;
  }

  const prepared = await fetchPreparedCoastlineSegments(gameArea, options);
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
  options?: FetchCoastlineOptions,
): Promise<{
  coastPoint: LatLngTuple;
  distanceMeters: number;
  segmentCount: number;
} | null> {
  const context = await loadCoastlineContext(seeker, gameArea, options);
  if (!context) {
    return null;
  }

  return {
    coastPoint: context.coastPoint,
    distanceMeters: context.distanceMeters,
    segmentCount: context.segmentCount,
  };
}
