import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "../geometry/geometry";
import type { MatchingFeature } from "../geo/types";
import { pickNearestMatchingFeature } from "../geo/matchingAdapters";
import {
  buildMatchingEliminationRegion,
  buildSameNearestRegion,
} from "../geometry/matchingGeometry";
import {
  buildMeasuringBoundaryPreview,
  buildMeasuringEliminationPreview,
} from "../geometry/measuringRegions";
import { destinationPoint } from "../geometry/core/geodesicPrimitives";
import { buildTentacleEliminationRegion } from "../geometry/tentacleGeometry";
import type { TentaclePoi } from "../map/annotations";
import type {
  MatchingAnswer,
  MatchingCategoryId,
  MeasuringAnswer,
  MeasuringFromKind,
} from "../questions";
import { matchingCategoryLabel } from "../questions/matchingQuestions";
import {
  applyMeasuringFromKind,
  measuringCatalogOption,
} from "../questions/measuringQuestions";

const MOCK_MATCHING_FEATURE_COUNT = 6;

export function mockMatchingCategoryName(categoryId: MatchingCategoryId): string {
  return matchingCategoryLabel(categoryId);
}

export function mockMeasuringTargetName(kind: MeasuringFromKind): string {
  return measuringCatalogOption(kind)?.label ?? "Place";
}

export function syntheticMatchingFeatures(anchor: LatLngTuple): {
  features: MatchingFeature[];
  nearestId: string;
  nearestPoint: LatLngTuple;
} {
  const bearings = [20, 80, 140, 220, 280, 340];
  const distances = [800, 1200, 1600, 2000, 2400, 2800];

  const features: MatchingFeature[] = bearings.map((bearing, index) => {
    const point = destinationPoint(anchor, distances[index]!, bearing);
    return {
      id: `tutorial-match-${index}`,
      name: `Feature ${index + 1}`,
      point,
      inPlayArea: true,
    };
  });

  const nearest = pickNearestMatchingFeature(anchor, features);
  const nearestId = nearest?.id ?? features[0]!.id;
  const nearestPoint =
    features.find((feature) => feature.id === nearestId)?.point ?? anchor;

  return { features, nearestId, nearestPoint };
}

export function buildTutorialMatchingPreviews(
  _anchor: LatLngTuple,
  answer: MatchingAnswer | null,
  gameArea: GameArea,
  features: MatchingFeature[],
  nearestId: string,
): {
  boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
  eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
} {
  const boundaryPreview = buildSameNearestRegion(features, nearestId, gameArea);
  const eliminationPreview =
    answer === null
      ? null
      : buildMatchingEliminationRegion(features, nearestId, gameArea, answer);

  return { boundaryPreview, eliminationPreview };
}

export function syntheticMeasuringTargetPoint(
  anchor: LatLngTuple,
  distanceMeters: number,
): LatLngTuple {
  return destinationPoint(anchor, distanceMeters, 45);
}

export function buildTutorialMeasuringPreviews(
  anchor: LatLngTuple,
  measureFrom: MeasuringFromKind,
  distanceMeters: number,
  answer: MeasuringAnswer | null,
  gameArea: GameArea,
): {
  targetPoint: LatLngTuple;
  boundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
  eliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
} {
  const targetPoint = syntheticMeasuringTargetPoint(anchor, distanceMeters);
  const applied = applyMeasuringFromKind(measureFrom);

  if (applied.subject !== "location") {
    return {
      targetPoint,
      boundaryPreview: null,
      eliminationPreview: null,
    };
  }

  const regionInput = {
    gameArea,
    measuringSubject: applied.subject,
    measuringLocationCategory: applied.locationCategory,
    measuringDistanceMeters: distanceMeters,
    measuringAnswer: answer,
    measuringTargetPoint: targetPoint,
    measuringPlaces: [],
    measuringCoastSegments: [],
    measuringSeaLevelNearRegion: null,
    usesAllPlacesInArea: false,
  };

  const boundaryPreview = buildMeasuringBoundaryPreview(regionInput);
  const eliminationPreview =
    answer === null
      ? null
      : buildMeasuringEliminationPreview({
          ...regionInput,
          precomputedNearRegion: boundaryPreview,
        });

  return { targetPoint, boundaryPreview, eliminationPreview };
}

export function buildTutorialTentacleElimination(
  center: LatLngTuple,
  searchRadiusMeters: number,
  pois: readonly TentaclePoi[],
  selectedPoiId: string | null,
  outOfReach: boolean,
  gameArea: GameArea,
): Feature<GeoPolygon | MultiPolygon> | null {
  if (outOfReach || !selectedPoiId || pois.length < 2) {
    return null;
  }

  return buildTentacleEliminationRegion(
    center,
    searchRadiusMeters,
    pois,
    selectedPoiId,
    gameArea,
  );
}

export { MOCK_MATCHING_FEATURE_COUNT };
