import type { MatchingCategoryId } from "@/domain/questions";
import { matchingEmptyPlayAreaMessage } from "@/services/geo/matching";

/** Empty play-area catalog: nullAnswer with zero loaded features. */
export function isMatchingEmptyPlayAreaCatalog(result: {
  nullAnswer: boolean;
  featureCount: number;
}): boolean {
  return result.nullAnswer === true && result.featureCount === 0;
}

/** Pin missed while features exist in the area: do not bounce. */
export function isMatchingPinMissWithFeatures(result: {
  nullAnswer: boolean;
  featureCount: number;
  nearestFeatureId: string | null;
}): boolean {
  return (
    result.featureCount > 0 &&
    result.nearestFeatureId === null &&
    result.nullAnswer === false
  );
}

export function markMatchingCategoryUnavailable(
  current: ReadonlyMap<MatchingCategoryId, string>,
  categoryId: MatchingCategoryId,
): {
  unavailableMatchingCategories: Map<MatchingCategoryId, string>;
  catalogNotice: string;
} {
  const catalogNotice = matchingEmptyPlayAreaMessage(categoryId);
  const unavailableMatchingCategories = new Map(current);
  unavailableMatchingCategories.set(categoryId, catalogNotice);
  return { unavailableMatchingCategories, catalogNotice };
}
