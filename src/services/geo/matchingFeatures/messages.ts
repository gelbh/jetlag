import {
  getMatchingCategory,
  matchingCategoryLabel,
  matchingUsesExpandedFeatureSearch,
  type MatchingCategoryId,
} from "../../../domain/questions";

export function matchingFeatureCountLabel(
  featureCount: number,
  inPlayAreaFeatureCount: number,
  usesContainmentMatching: boolean,
  usesLandmassMatching: boolean,
): string | undefined {
  if (featureCount <= 0) {
    return undefined;
  }

  const noun = usesContainmentMatching
    ? usesLandmassMatching
      ? "landmass"
      : "division"
    : "feature";
  const plural = featureCount === 1 ? "" : "s";
  const nearbyCount = featureCount - inPlayAreaFeatureCount;

  if (usesContainmentMatching || nearbyCount === 0) {
    return `${featureCount} ${noun}${plural} in play area`;
  }

  if (inPlayAreaFeatureCount === 0) {
    return `${featureCount} ${noun}${plural} nearby`;
  }

  return `${featureCount} ${noun}${plural} (${inPlayAreaFeatureCount} in play area, ${nearbyCount} nearby)`;
}

export function matchingFeatureNotFoundMessage(
  categoryId: MatchingCategoryId,
): string {
  const label = matchingCategoryLabel(categoryId).toLowerCase();
  const category = getMatchingCategory(categoryId);

  if (matchingUsesExpandedFeatureSearch(category)) {
    return `No named ${label} found near this play area.`;
  }

  return `No named ${label} found in this play area.`;
}

export function matchingNullAnswerMessage(
  categoryId: MatchingCategoryId,
): string {
  const category = getMatchingCategory(categoryId);
  const label = matchingCategoryLabel(categoryId).toLowerCase();
  const nullSuffix = " You can still answer Yes or No as a null match.";

  if (category.resolver === "landmass") {
    return `No landmass intersects the play area.${nullSuffix}`;
  }

  if (category.resolver === "reverseGeocodeAdmin") {
    return `No ${label} intersects the play area.${nullSuffix}`;
  }

  if (categoryId === "commercial_airport") {
    return `No commercial airport with a flight code was found near this play area.${nullSuffix}`;
  }

  return `No named ${label} found near this play area.${nullSuffix}`;
}

export function matchingResolveFailureMessage(
  categoryId: MatchingCategoryId,
  featureCount: number,
): string {
  const category = getMatchingCategory(categoryId);
  const label = matchingCategoryLabel(categoryId).toLowerCase();

  if (featureCount === 0) {
    if (category.resolver === "reverseGeocodeAdmin") {
      return `No named ${label} intersect this play area.`;
    }

    if (category.resolver === "landmass") {
      return "No landmass intersects this play area.";
    }

    return matchingFeatureNotFoundMessage(categoryId);
  }

  if (category.resolver === "reverseGeocodeAdmin") {
    return `Your anchor is not inside any of the ${featureCount} named ${label}${featureCount === 1 ? "" : "s"} loaded for this play area. Try another pin or clarify borders.`;
  }

  if (category.resolver === "landmass") {
    return `Your anchor is not inside any of the ${featureCount} landmass${featureCount === 1 ? "" : "es"} loaded for this play area. Try another pin.`;
  }

  return `No nearest ${label} could be resolved for your anchor.`;
}
