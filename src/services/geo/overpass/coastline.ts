import type { Feature, LineString } from "geojson";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  nearestPointToCoastlines,
  type PreparedLinearSegments,
  prepareMeasuringLineSegments,
} from "@/domain/geometry/measuring/geometryMeasuring";
import type { GameArea } from "@/domain/map/annotations";
import type { ProgressNode } from "@/domain/progress/progressTree";
import type { RegionPackId } from "@/domain/regions/regionPack";
import { yieldToMain } from "../../core/progress/yieldToMain";
import {
  coastlineSegmentsCacheKey,
  getOrFetchCached,
  readCachedMemoryEntry,
  writeCoastlineSegmentsCache,
} from "../cache";
import { mergeOverpassElementPayloads, type OverpassBbox } from "./overpassBboxSplit";
import {
  cachedFetchOptions,
  enrichInBackground,
  type OverpassLoad,
  overpassLoadFromFetch,
  overpassLoadFromTask,
  overpassSearchStage,
  type PackThenOverpassProgress,
  queryOverpassSplitLoaded,
  withBundleStage,
} from "./overpassLoad";
import { formatOverpassBbox, overpassQueryTemplate } from "./query";
import { loadBundledCoastlinePack, mergeCoastlineSegments } from "./regionPackCoastline";

export interface FetchCoastlineOptions extends PackThenOverpassProgress {
  regionPackId?: RegionPackId;
  onEnrich?: (prepared: PreparedLinearSegments) => void;
}

export function buildCoastlineQueryForBbox(bbox: OverpassBbox): string {
  const bboxStr = formatOverpassBbox(bbox);
  return overpassQueryTemplate(`
    way["natural"="coastline"](${bboxStr});
    out geom;
  `);
}

export function buildCoastlineQuery(gameArea: GameArea): string {
  return buildCoastlineQueryForBbox(gameAreaToBoundingBox(gameArea));
}

function wayToLineString(nodes: Array<{ lat: number; lon: number }>): Feature<LineString> | null {
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

const COASTLINE_HISTORY_KEY = "overpass:coastline";

const COASTLINE_SEGMENTS_STAGE = {
  kind: "compute",
  label: "Preparing coastline",
  historyKey: "compute:segments",
} as const;

async function fetchCoastlineSegmentsFromOverpass(
  gameArea: GameArea,
  load: OverpassLoad = {},
): Promise<Feature<LineString>[]> {
  const payload = await queryOverpassSplitLoaded<{
    elements: Array<{
      type: string;
      id: number;
      geometry?: Array<{ lat: number; lon: number }>;
    }>;
  }>(
    buildCoastlineQueryForBbox,
    gameAreaToBoundingBox(gameArea),
    mergeOverpassElementPayloads,
    load,
  );

  return payload.elements
    .filter((element) => element.type === "way" && element.geometry)
    .map((element) => wayToLineString(element.geometry ?? []))
    .filter((segment): segment is Feature<LineString> => segment !== null);
}

async function prepareMergedCoastlineSegments(
  gameArea: GameArea,
  bundledSegments: Feature<LineString>[],
  load: OverpassLoad = {},
  prepareNode?: ProgressNode,
): Promise<PreparedLinearSegments> {
  const overpassSegments = await fetchCoastlineSegmentsFromOverpass(gameArea, load);
  const segments = mergeCoastlineSegments(overpassSegments, bundledSegments);
  prepareNode?.start();
  if (prepareNode) {
    await yieldToMain();
  }
  const prepared = prepareMeasuringLineSegments(segments, gameArea);
  prepareNode?.finish();
  return prepared;
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
  const task = options?.task;
  const searchSpec = overpassSearchStage(COASTLINE_HISTORY_KEY, gameAreaToBoundingBox(gameArea));
  const pack = options?.regionPackId
    ? await withBundleStage(
        task,
        () => loadBundledCoastlinePack(options.regionPackId as RegionPackId),
        { kind: "fetch", label: "Loading bundled coastline", historyKey: "bundle:coastline" },
      )
    : null;

  if (pack?.source === "none") {
    const empty = prepareMeasuringLineSegments([], gameArea);
    await writeCoastlineSegmentsCache(gameArea, empty);
    return empty;
  }

  const bundledSegments = pack?.segments ?? [];

  // Pack-first: return immediately without writing the incomplete pack into the
  // shared coastline cache (same dual-phase shape as measuringPlaces).
  if (bundledSegments.length > 0 && options?.onEnrich) {
    const prepared = prepareMeasuringLineSegments(bundledSegments, gameArea);
    enrichInBackground(
      options.createEnrichTask,
      searchSpec,
      async (load) => {
        const merged = await prepareMergedCoastlineSegments(gameArea, bundledSegments, load);
        await writeCoastlineSegmentsCache(gameArea, merged);
        return merged;
      },
      (merged) => options.onEnrich?.(merged),
    );
    return prepared;
  }

  const prepareNode = task?.stage(COASTLINE_SEGMENTS_STAGE);
  const load = overpassLoadFromTask(task, searchSpec);
  return getOrFetchCached(
    coastlineSegmentsCacheKey(gameArea),
    (context) =>
      prepareMergedCoastlineSegments(
        gameArea,
        bundledSegments,
        overpassLoadFromFetch(context),
        prepareNode,
      ),
    cachedFetchOptions(load, searchSpec),
  );
}

export function getCachedPreparedCoastlineSegments(
  gameArea: GameArea,
): PreparedLinearSegments | undefined {
  return readCachedMemoryEntry<PreparedLinearSegments>(coastlineSegmentsCacheKey(gameArea));
}

export type CoastlineContext = {
  coastPoint: LatLngTuple;
  distanceMeters: number;
  segmentCount: number;
  segments: Feature<LineString>[];
};

export function resolveCoastlineContextFromCache(
  seeker: LatLngTuple,
  gameArea: GameArea,
): CoastlineContext | null {
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
    segments: prepared.segments,
  };
}

export async function loadCoastlineContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
  options?: FetchCoastlineOptions,
): Promise<CoastlineContext | null> {
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
    segments: prepared.segments,
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
