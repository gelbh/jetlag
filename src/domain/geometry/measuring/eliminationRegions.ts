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

export function polygonFeatureToLeafletPolygonGroups(
  feature: Feature<Polygon | MultiPolygon>,
): LatLngTuple[][][] {
  if (feature.geometry.type === "MultiPolygon") {
    return feature.geometry.coordinates.map((polygon) =>
      polygon.map((ring) =>
        ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
      ),
    );
  }

  return [
    feature.geometry.coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    ),
  ];
}

export function polygonFeatureToLeafletRings(
  feature: Feature<Polygon | MultiPolygon>,
): LatLngTuple[][] {
  return polygonFeatureToLeafletPolygonGroups(feature).flat();
}
