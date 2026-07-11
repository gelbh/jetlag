import { formatPlayAreaSummary, gameAreaSquareMiles } from "../../domain/session/gameSize";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { isPointInGameArea, placeToGameArea } from "../../domain/geometry/geometryCore";
import { haversineMeters } from "../../domain/geometry/distance";
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

const BOUNDS_FINGERPRINT_PRECISION = 3;

export function placeBoundsFingerprint(
  place: Pick<GeocodedPlace, "bounds">,
): string {
  const round = (value: number) =>
    Number(value.toFixed(BOUNDS_FINGERPRINT_PRECISION));
  const { south, west, north, east } = place.bounds;
  return `${round(south)}|${round(west)}|${round(north)}|${round(east)}`;
}

function candidateQualityScore(candidate: RankedGeocodedPlaceCandidate): number {
  let score = candidate.importance;

  if (candidate.place.boundary !== undefined) {
    score += 1_000;
  }

  if (candidate.fromCityQuery) {
    score += 100;
  }

  return score;
}

export function mergeRankedGeocodedPlaceCandidates(
  left: RankedGeocodedPlaceCandidate,
  right: RankedGeocodedPlaceCandidate,
): RankedGeocodedPlaceCandidate {
  const winner =
    candidateQualityScore(right) > candidateQualityScore(left) ? right : left;

  return {
    place: winner.place,
    importance: Math.max(left.importance, right.importance),
    fromCityQuery: left.fromCityQuery || right.fromCityQuery,
  };
}

function placeContainsPoint(place: GeocodedPlace, point: LatLngTuple): boolean {
  const gameArea = place.boundary ?? placeToGameArea(place);
  return isPointInGameArea(point, gameArea);
}

function containsUserScore(place: GeocodedPlace, near?: LatLngTuple): number {
  if (!near) {
    return 0;
  }

  return placeContainsPoint(place, near) ? 1 : 0;
}

function distanceToCenterScore(place: GeocodedPlace, near?: LatLngTuple): number {
  if (!near) {
    return 0;
  }

  return -haversineMeters(near, place.center);
}

export function rankGeocodedPlaceCandidates(
  candidates: RankedGeocodedPlaceCandidate[],
  query: string,
  near?: LatLngTuple,
): GeocodedPlace[] {
  return [...candidates]
    .sort((left, right) => {
      const nameDelta =
        nameMatchScore(right.place.displayName, query) -
        nameMatchScore(left.place.displayName, query);
      if (nameDelta !== 0) {
        return nameDelta;
      }

      if (near) {
        const containsDelta =
          containsUserScore(right.place, near) -
          containsUserScore(left.place, near);
        if (containsDelta !== 0) {
          return containsDelta;
        }

        const distanceDelta =
          distanceToCenterScore(right.place, near) -
          distanceToCenterScore(left.place, near);
        if (distanceDelta !== 0) {
          return distanceDelta;
        }
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
