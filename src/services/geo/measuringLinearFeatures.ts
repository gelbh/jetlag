import type { Feature, LineString } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
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
} from "../../domain/questions/measuringQuestions";
import {
  getOrFetchCached,
  linearSegmentsCacheKey,
} from "./geographicFeatureCache";
import { queryOverpass } from "../core/overpassClient";

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

export async function fetchMeasuringLinearSegments(
  gameArea: GameArea,
  kind: MeasuringFromKind,
): Promise<Feature<LineString>[]> {
  const prepared = await fetchPreparedMeasuringLinearSegments(gameArea, kind);
  return prepared.segments;
}

export async function fetchPreparedMeasuringLinearSegments(
  gameArea: GameArea,
  kind: MeasuringFromKind,
): Promise<PreparedLinearSegments> {
  return getOrFetchCached(linearSegmentsCacheKey(gameArea, kind), async () => {
    const segments = await fetchMeasuringLinearSegmentsFromOverpass(
      gameArea,
      kind,
    );
    return prepareMeasuringLineSegments(segments, gameArea);
  });
}

export async function loadMeasuringLinearContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
  kind: MeasuringFromKind,
): Promise<{
  point: LatLngTuple;
  distanceMeters: number;
  segments: Feature<LineString>[];
} | null> {
  const prepared = await fetchPreparedMeasuringLinearSegments(gameArea, kind);
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
