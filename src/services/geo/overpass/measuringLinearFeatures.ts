import type { Feature, LineString } from "geojson";
import { gameAreaToBoundingBox, type LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  nearestPointToCoastlines,
  type PreparedLinearSegments,
  prepareMeasuringLineSegments,
} from "@/domain/geometry/measuring/geometryMeasuring";
import type { GameArea } from "@/domain/map/annotations";
import {
  type MeasuringFromKind,
  measuringLinearOverpassSelectors,
  measuringLocationLabel,
} from "@/domain/questions";
import type { RegionPackId } from "@/domain/regions/regionPack";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "@/domain/session/catalog/sessionCustomContent";
import type { LoadTask } from "../../core/progress/loadTask";
import { yieldToMain } from "../../core/progress/yieldToMain";
import { getOrFetchCached, linearSegmentsCacheKey } from "../cache";
import { loadRegionPackMatchingAreas } from "../matching/regionPackBoundaries";
import {
  adminLevelForMeasuringBorderKind,
  allowsOverpassAdminBorderFallthrough,
  isMeasuringAdminBorderKind,
} from "./adminDivisionAvailability";
import { fetchCustomAdminBorderLineSegments } from "./adminDivisionLineStrings";
import { mergeOverpassElementPayloads, type OverpassBbox } from "./overpassBboxSplit";
import {
  cachedFetchOptions,
  type OverpassLoad,
  overpassLoadFromFetch,
  overpassLoadFromTask,
  overpassSearchStage,
  queryOverpassSplitLoaded,
} from "./overpassLoad";
import { loadBundledInternationalBorderPack } from "./regionPackInternationalBorder";

type OverpassWay = {
  type: string;
  id: number;
  geometry?: Array<{ lat: number; lon: number }>;
};

export function buildLinearFeaturesQueryForBbox(
  bbox: OverpassBbox,
  selectors: readonly string[],
): string {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  const clauses = selectors.map((selector) => `way${selector}(${bboxStr});`);

  return `
    [out:json][timeout:25];
  (
    ${clauses.join("\n    ")}
  );
  out geom;
  `;
}

export function buildLinearFeaturesQuery(gameArea: GameArea, selectors: readonly string[]): string {
  return buildLinearFeaturesQueryForBbox(gameAreaToBoundingBox(gameArea), selectors);
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

const LINEAR_GROUP_STAGE = {
  kind: "group",
  label: "Finding features",
  historyKey: "measuring:linear",
} as const;

const LINEAR_SEGMENTS_STAGE = {
  kind: "compute",
  label: "Preparing line segments",
  historyKey: "compute:segments",
} as const;

async function fetchMeasuringLinearSegmentsFromOverpass(
  gameArea: GameArea,
  kind: MeasuringFromKind,
  load: OverpassLoad = {},
): Promise<Feature<LineString>[]> {
  const selectors = measuringLinearOverpassSelectors(kind);
  if (selectors.length === 0) {
    return [];
  }

  const bbox = gameAreaToBoundingBox(gameArea);
  const payload = await queryOverpassSplitLoaded<{ elements: OverpassWay[] }>(
    (child) => buildLinearFeaturesQueryForBbox(child, selectors),
    bbox,
    mergeOverpassElementPayloads,
    { ...load, node: load.node?.stage(overpassSearchStage("overpass:linear", bbox)) },
  );

  return payload.elements
    .filter((element) => element.type === "way" && element.geometry)
    .map((element) => wayToLineString(element.geometry ?? []))
    .filter((segment): segment is Feature<LineString> => segment !== null);
}

async function fetchMeasuringLinearSegmentsForKind(
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  load?: OverpassLoad,
): Promise<Feature<LineString>[]> {
  if (kind === "international_border" && regionPackId) {
    const pack = await loadBundledInternationalBorderPack(regionPackId);
    if (pack && pack.segments.length > 0) {
      return pack.segments;
    }
    if (!allowsOverpassAdminBorderFallthrough(regionPackId)) {
      return [];
    }
  }

  if (isMeasuringAdminBorderKind(kind)) {
    const customSegments = await fetchCustomAdminBorderLineSegments(
      gameArea,
      kind,
      customMatchingAreas,
    );
    if (customSegments.length > 0) {
      return customSegments;
    }

    if (regionPackId) {
      try {
        const packAreas = await loadRegionPackMatchingAreas(regionPackId);
        const packSegments = await fetchCustomAdminBorderLineSegments(gameArea, kind, packAreas);
        if (packSegments.length > 0) {
          return packSegments;
        }
      } catch {}
    }

    if (!allowsOverpassAdminBorderFallthrough(regionPackId)) {
      return [];
    }
  }

  return fetchMeasuringLinearSegmentsFromOverpass(gameArea, kind, load);
}

export async function fetchMeasuringLinearSegments(
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
): Promise<Feature<LineString>[]> {
  const prepared = await fetchPreparedMeasuringLinearSegments(
    gameArea,
    kind,
    customMatchingAreas,
    regionPackId,
  );
  return prepared.segments;
}

function customBorderCacheSuffix(
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
): string {
  const packSuffix = regionPackId ? `:pack-${regionPackId}` : "";

  // Pack vs Overpass vs empty must not share one prepared-segments key.
  if (kind === "international_border") {
    return packSuffix;
  }

  if (!isMeasuringAdminBorderKind(kind)) {
    return "";
  }

  const level = adminLevelForMeasuringBorderKind(kind) as MatchingAdminLevel;
  const custom = customMatchingAreas?.[level];
  const customSuffix = custom ? `:custom-${level}-${custom.length}` : "";
  return `${customSuffix}${packSuffix}`;
}

export async function fetchPreparedMeasuringLinearSegments(
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  task?: LoadTask,
): Promise<PreparedLinearSegments> {
  const cacheKey =
    linearSegmentsCacheKey(gameArea, kind) +
    customBorderCacheSuffix(kind, customMatchingAreas, regionPackId);

  return getOrFetchCached(
    cacheKey,
    async (context) => {
      const segments = await fetchMeasuringLinearSegmentsForKind(
        gameArea,
        kind,
        customMatchingAreas,
        regionPackId,
        overpassLoadFromFetch(context),
      );
      const prepare = context.node.stage(LINEAR_SEGMENTS_STAGE).start();
      await yieldToMain();
      const prepared = prepareMeasuringLineSegments(segments, gameArea);
      prepare.finish();
      return prepared;
    },
    cachedFetchOptions(overpassLoadFromTask(task, LINEAR_GROUP_STAGE), LINEAR_GROUP_STAGE),
  );
}

export async function loadMeasuringLinearContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
  regionPackId?: RegionPackId,
  task?: LoadTask,
): Promise<{
  point: LatLngTuple;
  distanceMeters: number;
  segments: Feature<LineString>[];
} | null> {
  const prepared = await fetchPreparedMeasuringLinearSegments(
    gameArea,
    kind,
    customMatchingAreas,
    regionPackId,
    task,
  );
  const nearest = nearestPointToCoastlines(seeker, prepared.segments, prepared);

  if (!nearest) {
    return null;
  }

  return {
    point: nearest.point,
    distanceMeters: nearest.distanceMeters,
    segments: prepared.segments,
  };
}

export function measuringLinearNotFoundMessage(kind: MeasuringFromKind): string {
  const label = measuringLocationLabel(kind).toLowerCase();
  return `No ${label} found in this play area.`;
}
