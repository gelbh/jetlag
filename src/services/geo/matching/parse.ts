import type { GameArea } from "../../../domain/map/annotations";
import {
  isPointInGameArea,
  type LatLngTuple,
} from "../../../domain/geometry/geometry";
import type { MatchingFeature } from "../../../domain/geo/types";
import {
  getMatchingCategory,
  matchingUsesExpandedFeatureSearch,
  type MatchingCategoryId,
} from "../../../domain/questions";
import { resolveMatchingCategory } from "../../../domain/session/sessionCustomCatalog";
import type { SessionCustomCategory } from "../../../domain/session/sessionCustomContent";
import type { OverpassElement } from "./types";

function isHonoraryConsulate(tags: Record<string, string>): boolean {
  const diplomatic = tags.diplomatic?.toLowerCase() ?? "";
  const office = tags.office?.toLowerCase() ?? "";
  const name = tags.name?.toLowerCase() ?? "";

  return (
    diplomatic.includes("honorary") ||
    office.includes("honorary") ||
    name.includes("honorary")
  );
}

function isMiniatureGolf(tags: Record<string, string>): boolean {
  return tags.miniature === "yes" || tags.golf === "miniature";
}

function matchingFeatureName(tags: Record<string, string>): string | null {
  const candidates = [
    tags.name,
    tags["name:en"],
    tags.official_name,
    tags["official_name:en"],
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function isActiveMatchingFeature(
  tags: Record<string, string> | undefined,
  categoryId: MatchingCategoryId,
): boolean {
  if (!tags) {
    return false;
  }

  const name = matchingFeatureName(tags);
  if (!name) {
    return false;
  }

  if (tags.disused === "yes" || tags.abandoned === "yes") {
    return false;
  }

  if (categoryId === "foreign_consulate" && isHonoraryConsulate(tags)) {
    return false;
  }

  if (categoryId === "golf_course" && isMiniatureGolf(tags)) {
    return false;
  }

  return true;
}

export function parseMatchingFeatures(
  elements: OverpassElement[],
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): MatchingFeature[] {
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);
  const includeOutsidePlayArea = matchingUsesExpandedFeatureSearch(category);
  const seen = new Set<string>();

  return elements
    .map((element): MatchingFeature | null => {
      if (!isActiveMatchingFeature(element.tags, categoryId)) {
        return null;
      }

      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;

      if (lat === undefined || lng === undefined) {
        return null;
      }

      const point: LatLngTuple = [lat, lng];
      const inPlayArea = isPointInGameArea(point, gameArea);
      if (!includeOutsidePlayArea && !inPlayArea) {
        return null;
      }

      const id = String(element.id);
      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      return {
        id,
        name: matchingFeatureName(element.tags!) ?? "",
        point,
        inPlayArea,
      };
    })
    .filter((feature): feature is MatchingFeature => feature !== null);
}

export function countMatchingFeaturesInPlayArea(
  features: MatchingFeature[],
): number {
  return features.filter((feature) => feature.inPlayArea !== false).length;
}
