import type { Feature, LineString } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "../../domain/session/sessionCustomContent";
import {
  gameAreaToBoundingBox,
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
  type LatLngTuple,
  type PreparedLinearSegments,
} from "../../domain/geometry/geometry";
import {
  measuringLinearOverpassSelectors,
  measuringLocationLabel,
  type MeasuringFromKind,
} from "../../domain/questions";
import {
  getOrFetchCached,
  linearSegmentsCacheKey,
} from "./geographicFeatureCache";
import { queryOverpass } from "../core/overpassClient";
import {
  adminLevelForMeasuringBorderKind,
  isMeasuringAdminBorderKind,
} from "./adminDivisionAvailability";
import { fetchCustomAdminBorderLineSegments } from "./adminDivisionLineStrings";

type OverpassWay = {
  type: string;
  geometry?: Array<{ lat: number; lon: number }>;
};

export function buildLinearFeaturesQuery(
  gameArea: GameArea,
  selectors: readonly string[],
): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const bbox = `${south},${west},${north},${east}`;
  const clauses = selectors.map((selector) => `way${selector}(${bbox});`);

  return `
    [out:json][timeout:25];
  (
    ${clauses.join("\n    ")}
  );
  out geom;
  `;
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

async function fetchMeasuringLinearSegmentsFromOverpass(
  gameArea: GameArea,
  kind: MeasuringFromKind,
): Promise<Feature<LineString>[]> {
  const selectors = measuringLinearOverpassSelectors(kind);
  if (selectors.length === 0) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassWay[] }>(
    buildLinearFeaturesQuery(gameArea, selectors),
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
): Promise<Feature<LineString>[]> {
  if (isMeasuringAdminBorderKind(kind)) {
    const customSegments = await fetchCustomAdminBorderLineSegments(
      gameArea,
      kind,
      customMatchingAreas,
    );
    if (customSegments.length > 0) {
      return customSegments;
    }
  }

  return fetchMeasuringLinearSegmentsFromOverpass(gameArea, kind);
}

export async function fetchMeasuringLinearSegments(
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
): Promise<Feature<LineString>[]> {
  const prepared = await fetchPreparedMeasuringLinearSegments(
    gameArea,
    kind,
    customMatchingAreas,
  );
  return prepared.segments;
}

function customBorderCacheSuffix(
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
): string {
  if (!isMeasuringAdminBorderKind(kind)) {
    return "";
  }

  const level = adminLevelForMeasuringBorderKind(kind) as MatchingAdminLevel;
  const custom = customMatchingAreas?.[level];
  return custom ? `:custom-${level}-${custom.length}` : "";
}

export async function fetchPreparedMeasuringLinearSegments(
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
): Promise<PreparedLinearSegments> {
  const cacheKey =
    linearSegmentsCacheKey(gameArea, kind) +
    customBorderCacheSuffix(kind, customMatchingAreas);

  return getOrFetchCached(cacheKey, async () => {
    const segments = await fetchMeasuringLinearSegmentsForKind(
      gameArea,
      kind,
      customMatchingAreas,
    );
    return prepareMeasuringLineSegments(segments, gameArea);
  });
}

export async function loadMeasuringLinearContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
  kind: MeasuringFromKind,
  customMatchingAreas?: CustomMatchingAreasByLevel,
): Promise<{
  point: LatLngTuple;
  distanceMeters: number;
  segments: Feature<LineString>[];
} | null> {
  const prepared = await fetchPreparedMeasuringLinearSegments(
    gameArea,
    kind,
    customMatchingAreas,
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

export function measuringLinearNotFoundMessage(
  kind: MeasuringFromKind,
): string {
  const label = measuringLocationLabel(kind).toLowerCase();
  return `No ${label} found in this play area.`;
}
