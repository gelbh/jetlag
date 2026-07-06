import { formatPlayAreaSummary, gameAreaSquareMiles } from "../domain/gameSize";
import { placeToGameArea } from "../domain/geometryCore";
import type { GeocodedPlace } from "./geocoding";

const SETTLEMENT_CATEGORIES = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "borough",
  "municipality",
  "suburb",
  "neighbourhood",
]);

const BROAD_ADMIN_CATEGORIES = new Set([
  "administrative",
  "state",
  "county",
  "region",
  "district",
  "province",
  "country",
]);

export interface NominatimPlaceMetadata {
  addresstype?: string;
  type?: string;
  class?: string;
}

export function placeCategoryLabel(metadata: NominatimPlaceMetadata): string {
  const addresstype = metadata.addresstype?.trim().toLowerCase();
  if (addresstype) {
    if (addresstype === "administrative") {
      return "administrative area";
    }

    return addresstype;
  }

  const type = metadata.type?.trim().toLowerCase();
  if (type === "administrative") {
    return "administrative area";
  }

  if (type) {
    return type;
  }

  const klass = metadata.class?.trim().toLowerCase();
  if (klass === "boundary") {
    return "administrative area";
  }

  if (klass) {
    return klass;
  }

  return "place";
}

export function computeApproximateAreaSqMi(
  place: Pick<GeocodedPlace, "bounds" | "boundary">,
): number {
  return gameAreaSquareMiles(placeToGameArea(place));
}

export function formatPlaceSearchSubtitle(place: GeocodedPlace): string {
  const areaLabel = formatPlayAreaSummary(place.approximateAreaSqMi).replace(
    " play area",
    "",
  );

  return `${place.placeCategory} · ${areaLabel}`;
}

function normalizeForMatch(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function nameMatchScore(displayName: string, query: string): number {
  const normalizedName = normalizeForMatch(displayName);
  const normalizedQuery = normalizeForMatch(query);

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 3;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 2;
  }

  return 1;
}

function settlementPreferenceScore(category: string): number {
  const lower = category.toLowerCase();

  if (SETTLEMENT_CATEGORIES.has(lower)) {
    return 2;
  }

  if (BROAD_ADMIN_CATEGORIES.has(lower)) {
    return 0;
  }

  return 1;
}

export interface RankedGeocodedPlaceCandidate {
  place: GeocodedPlace;
  importance: number;
  fromCityQuery: boolean;
}

export function rankGeocodedPlaceCandidates(
  candidates: RankedGeocodedPlaceCandidate[],
  query: string,
): GeocodedPlace[] {
  return [...candidates]
    .sort((left, right) => {
      const nameDelta =
        nameMatchScore(right.place.displayName, query) -
        nameMatchScore(left.place.displayName, query);
      if (nameDelta !== 0) {
        return nameDelta;
      }

      const settlementDelta =
        settlementPreferenceScore(right.place.placeCategory) -
        settlementPreferenceScore(left.place.placeCategory);
      if (settlementDelta !== 0) {
        return settlementDelta;
      }

      if (left.fromCityQuery !== right.fromCityQuery) {
        return left.fromCityQuery ? -1 : 1;
      }

      const areaDelta =
        left.place.approximateAreaSqMi - right.place.approximateAreaSqMi;
      if (areaDelta !== 0) {
        return areaDelta;
      }

      return right.importance - left.importance;
    })
    .map((candidate) => candidate.place);
}
