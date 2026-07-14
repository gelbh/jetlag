import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../map/annotations";
import type { MeasuringAnswer } from "../../questions/measuringQuestions";
import {
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "../geometryCore";
import {
  buildCoastlineNearRegion,
  buildLocationNearRegion,
  buildMultiPlaceNearRegion,
} from "./nearRegions";

export function buildCoastlineEliminationRegion(
  segments: Feature<LineString>[],
  distanceMeters: number,
  gameArea: GameArea,
  answer: MeasuringAnswer,
  nearRegion?: Feature<Polygon | MultiPolygon> | null,
): Feature<Polygon | MultiPolygon> | null {
  const nearCoast =
    nearRegion ?? buildCoastlineNearRegion(segments, distanceMeters, gameArea);
  if (!nearCoast) {
    return null;
  }

  return buildMeasuringEliminationRegion(nearCoast, gameArea, answer);
}

export function buildLocationEliminationRegion(
  target: LatLngTuple,
  distanceMeters: number,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  const nearRegion = buildLocationNearRegion(target, distanceMeters, gameArea);
  if (!nearRegion) {
    return null;
  }

  return buildMeasuringEliminationRegion(nearRegion, gameArea, answer);
}

export function buildMultiPlaceEliminationRegion(
  places: readonly LatLngTuple[],
  distanceMeters: number,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  const nearRegion = buildMultiPlaceNearRegion(
    places,
    distanceMeters,
    gameArea,
  );
  if (!nearRegion) {
    return null;
  }

  return buildMeasuringEliminationRegion(nearRegion, gameArea, answer);
}

export function buildMeasuringEliminationRegion(
  nearRegion: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
  answer: MeasuringAnswer,
): Feature<Polygon | MultiPolygon> | null {
  if (answer === "further") {
    return nearRegion;
  }

  return safeDifference(gameAreaToPolygon(gameArea), nearRegion);
}

function isFiniteCoordPair(
  coord: number[] | null | undefined,
): coord is [number, number] {
  return (
    Array.isArray(coord) &&
    coord.length >= 2 &&
    Number.isFinite(coord[0]) &&
    Number.isFinite(coord[1])
  );
}

function sanitizeRing(ring: number[][]): LatLngTuple[] {
  const positions: LatLngTuple[] = [];

  for (const coord of ring) {
    if (!isFiniteCoordPair(coord)) {
      continue;
    }

    const [lng, lat] = coord;
    positions.push([lat, lng]);
  }

  return positions;
}

function sanitizePolygonRings(rings: number[][][]): LatLngTuple[][] | null {
  if (rings.length === 0) {
    return null;
  }

  const exterior = sanitizeRing(rings[0]);
  if (exterior.length < 3) {
    return null;
  }

  const holes = rings
    .slice(1)
    .map((ring) => sanitizeRing(ring))
    .filter((ring) => ring.length >= 3);

  return [exterior, ...holes];
}

export function polygonFeatureToLeafletPolygonGroups(
  feature: Feature<Polygon | MultiPolygon>,
): LatLngTuple[][][] {
  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates
      .map((polygon) => sanitizePolygonRings(polygon))
      .filter((polygon): polygon is LatLngTuple[][] => polygon !== null);
  }

  const polygon = sanitizePolygonRings(feature.geometry.coordinates);
  return polygon ? [polygon] : [];
}

export function polygonFeatureToLeafletRings(
  feature: Feature<Polygon | MultiPolygon>,
): LatLngTuple[][] {
  return polygonFeatureToLeafletPolygonGroups(feature).flat();
}
