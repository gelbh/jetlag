import type { GameArea } from "@/domain/map/annotations";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  getMatchingCategory,
  isMatchingCategoryAvailable,
  isMatchingCategoryEnabled,
  type MatchingCategoryId,
} from "@/domain/questions";
import { overpassErrorMessage } from "@/services/core/overpass/overpassClient";
import {
  countMatchingFeaturesInPlayArea,
  fetchMatchingFeaturesInArea,
  matchingResolveFailureMessage,
  pickMatchingFeatureForAnchor,
  type MatchingFeature,
  type MatchingFetchOptions,
} from "@/services/geo/matching";

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

/** Dual-phase apply guard: ignore a late phase-0 after phase-1 enrich for the same request. */
export function shouldApplyMatchingAnchorPhase(
  lastAppliedPhase: number,
  phase: 0 | 1,
): boolean {
  return phase >= lastAppliedPhase;
}

/**
 * After Overpass enrich, pack Wikidata ids may be replaced by OSM ids for the
 * same venue name. Keep commit/Voronoi keyed to a live feature id.
 */
export function reconcileLockedMatchingNearest(
  features: MatchingFeature[],
  lockedId: string | null,
  lockedName: string | null,
): {
  nearestFeatureId: string;
  nearestFeatureName: string;
  nearestFeaturePoint: LatLngTuple;
} | null {
  if (!lockedId) {
    return null;
  }

  const stillPresent = features.find((feature) => feature.id === lockedId);
  if (stillPresent) {
    return {
      nearestFeatureId: stillPresent.id,
      nearestFeatureName: stillPresent.name,
      nearestFeaturePoint: stillPresent.point,
    };
  }

  const normalized = lockedName?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return null;
  }

  const byName = features.find(
    (feature) => feature.name.trim().toLowerCase() === normalized,
  );
  if (!byName) {
    return null;
  }

  return {
    nearestFeatureId: byName.id,
    nearestFeatureName: byName.name,
    nearestFeaturePoint: byName.point,
  };
}

function buildResolveMatchingAnchorResult(
  seekerPoint: LatLngTuple,
  categoryId: MatchingCategoryId,
  features: MatchingFeature[],
): ResolveMatchingAnchorResult {
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
}

export async function resolveMatchingAnchor(input: {
  seekerPoint: LatLngTuple;
  categoryId: MatchingCategoryId;
  gameArea: GameArea;
  matchingFetchOptions: MatchingFetchOptions;
  onEnrich?: (result: ResolveMatchingAnchorResult) => void;
}): Promise<ResolveMatchingAnchorResult> {
  const {
    seekerPoint,
    categoryId,
    gameArea,
    matchingFetchOptions,
    onEnrich,
  } = input;

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
      {
        ...matchingFetchOptions,
        onEnrich: onEnrich
          ? (enrichedFeatures) => {
              onEnrich(
                buildResolveMatchingAnchorResult(
                  seekerPoint,
                  categoryId,
                  enrichedFeatures,
                ),
              );
            }
          : undefined,
      },
    );

    return buildResolveMatchingAnchorResult(
      seekerPoint,
      categoryId,
      features,
    );
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
