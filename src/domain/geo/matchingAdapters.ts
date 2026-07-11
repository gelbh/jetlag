import type { GameArea } from "../map/annotations";
import type { LatLngTuple } from "../geometry/geometry";
import { distanceBetweenPoints } from "../geometry/geometry";
import type {
  AdminDivisionFeature,
  MatchingFeature,
} from "./types";

export function adminDivisionToMatchingFeature(division: AdminDivisionFeature): {
  id: string;
  name: string;
  point: LatLngTuple;
  adminLevel: number;
  boundary: GameArea;
} {
  return {
    id: division.id,
    name: division.name,
    point: division.representativePoint,
    adminLevel: division.adminLevel,
    boundary: division.boundary,
  };
}

export function matchingFeaturesToAdminDivisions(
  features: MatchingFeature[],
): AdminDivisionFeature[] | null {
  if (features.length === 0) {
    return null;
  }

  if (!features.every((feature) => feature.boundary !== undefined)) {
    return null;
  }

  return features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    adminLevel: feature.adminLevel ?? 0,
    boundary: feature.boundary!,
    representativePoint: feature.point,
  }));
}

export function matchingFeaturesToBoundedRegions(
  features: MatchingFeature[],
): AdminDivisionFeature[] | null {
  return matchingFeaturesToAdminDivisions(features);
}

export function pickNearestMatchingFeature(
  anchor: LatLngTuple,
  features: MatchingFeature[],
): (MatchingFeature & { distanceMeters: number }) | null {
  let nearest: (MatchingFeature & { distanceMeters: number }) | null = null;

  for (const feature of features) {
    const distanceMeters = distanceBetweenPoints(anchor, feature.point);
    if (
      !nearest ||
      distanceMeters < nearest.distanceMeters ||
      (distanceMeters === nearest.distanceMeters &&
        feature.id.localeCompare(nearest.id) < 0)
    ) {
      nearest = { ...feature, distanceMeters };
    }
  }

  return nearest;
}

export function nearestMatchingFeatureIdForPoint(
  anchor: LatLngTuple,
  features: MatchingFeature[],
): string | null {
  return pickNearestMatchingFeature(anchor, features)?.id ?? null;
}

export function serializeMatchingFeatures(features: MatchingFeature[]): string {
  return JSON.stringify(features);
}

export function deserializeMatchingFeatures(
  payload: string | undefined,
): MatchingFeature[] {
  if (!payload) {
    return [];
  }

  try {
    const parsed = JSON.parse(payload) as MatchingFeature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
