import type { GameArea } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import {
  getMatchingCategory,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  type MatchingCategoryId,
} from "../../../domain/questions";
import { overpassErrorMessage } from "../../../services/core/overpass/overpassClient";
import {
  countMatchingFeaturesInPlayArea,
  fetchMatchingFeaturesInArea,
  matchingResolveFailureMessage,
  pickMatchingFeatureForAnchor,
  type MatchingFeature,
  type MatchingFetchOptions,
} from "../../../services/geo/matchingFeatures";

export interface ResolveMatchingAnchorResult {
  features: MatchingFeature[];
  featureCount: number;
  inPlayAreaFeatureCount: number;
  nearestFeatureId: string | null;
  nearestFeatureName: string | null;
  nearestFeaturePoint: LatLngTuple | null;
  distanceMeters: number | null;
  nearestOutsidePlayArea: boolean;
  nullAnswer: boolean;
  error: string | null;
}

export async function resolveMatchingAnchor(input: {
  seekerPoint: LatLngTuple;
  categoryId: MatchingCategoryId;
  gameArea: GameArea;
  matchingFetchOptions: MatchingFetchOptions;
}): Promise<ResolveMatchingAnchorResult> {
  const { seekerPoint, categoryId, gameArea, matchingFetchOptions } = input;

  if (
    !isMatchingCategoryEnabled(categoryId) ||
    !isMatchingCategoryAvailable(categoryId)
  ) {
    return {
      features: [],
      featureCount: 0,
      inPlayAreaFeatureCount: 0,
      nearestFeatureId: null,
      nearestFeatureName: null,
      nearestFeaturePoint: null,
      distanceMeters: null,
      nearestOutsidePlayArea: false,
      nullAnswer: false,
      error: "This matching category is not available yet.",
    };
  }

  try {
    const features = await fetchMatchingFeaturesInArea(
      gameArea,
      categoryId,
      matchingFetchOptions,
    );

    const featureCount = features.length;
    const inPlayAreaFeatureCount = countMatchingFeaturesInPlayArea(features);

    if (features.length === 0) {
      return {
        features,
        featureCount,
        inPlayAreaFeatureCount,
        nearestFeatureId: null,
        nearestFeatureName: null,
        nearestFeaturePoint: null,
        distanceMeters: null,
        nearestOutsidePlayArea: false,
        nullAnswer: true,
        error: null,
      };
    }

    const category = getMatchingCategory(categoryId);
    const usesContainment =
      category.resolver === "reverseGeocodeAdmin" ||
      category.resolver === "landmass";

    const nearest = pickMatchingFeatureForAnchor(
      seekerPoint,
      features,
      categoryId,
    );

    if (!nearest) {
      return {
        features,
        featureCount,
        inPlayAreaFeatureCount,
        nearestFeatureId: null,
        nearestFeatureName: null,
        nearestFeaturePoint: null,
        distanceMeters: null,
        nearestOutsidePlayArea: false,
        nullAnswer: features.length === 0,
        error: matchingResolveFailureMessage(categoryId, features.length),
      };
    }

    return {
      features,
      featureCount,
      inPlayAreaFeatureCount,
      nearestFeatureId: nearest.id,
      nearestFeatureName: nearest.name,
      nearestFeaturePoint: nearest.point,
      distanceMeters: usesContainment ? null : nearest.distanceMeters,
      nearestOutsidePlayArea: nearest.inPlayArea === false,
      nullAnswer: false,
      error: null,
    };
  } catch (error) {
    return {
      features: [],
      featureCount: 0,
      inPlayAreaFeatureCount: 0,
      nearestFeatureId: null,
      nearestFeatureName: null,
      nearestFeaturePoint: null,
      distanceMeters: null,
      nearestOutsidePlayArea: false,
      nullAnswer: false,
      error: overpassErrorMessage(error, "Couldn't resolve nearest feature."),
    };
  }
}
