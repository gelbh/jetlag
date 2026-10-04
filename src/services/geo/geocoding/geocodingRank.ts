import { haversineMeters } from "@/domain/geometry/gameArea/distance";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { isPointInGameArea, placeToGameArea } from "@/domain/geometry/gameArea/geometryCore";
import { formatPlayAreaSummary, gameAreaSquareMiles } from "@/domain/session/size/gameSize";
import type { GeocodedPlace } from "./normalize";

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
  const areaLabel = formatPlayAreaSummary(place.approximateAreaSqMi).replace(" play area", "");

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

  const head = normalizeForMatch(normalizedName.split(",")[0] ?? "");
  const headTokens = head.split(" ").filter(Boolean);
  const queryTokens = normalizedQuery.split(" ").filter(Boolean);

  if (head === normalizedQuery) {
    return 3;
  }

  if (queryTokens.length > 0 && queryTokens.every((token) => headTokens.includes(token))) {
    return 3;
  }

  if (normalizedName.startsWith(normalizedQuery)) {
    return 3;
  }

  if (normalizedName.includes(normalizedQuery)) {
    return 2;
  }

  return 1;
}

function playableSettlementScore(category: string): number {
  const lower = category.toLowerCase();
  if (BROAD_ADMIN_CATEGORIES.has(lower) || lower === "administrative area") {
    return 0;
  }
  if (SETTLEMENT_CATEGORIES.has(lower)) {
    return 1;
  }
  return 0;
}

function settlementGradeScore(category: string): number {
  const lower = category.toLowerCase();

  switch (lower) {
    case "city":
    case "municipality":
      return 4;
    case "town":
    case "borough":
      return 3;
    case "village":
    case "suburb":
      return 2;
    case "hamlet":
    case "neighbourhood":
      return 1;
    default:
      return SETTLEMENT_CATEGORIES.has(lower) ? 2 : 0;
  }
}

export interface RankedGeocodedPlaceCandidate {
  place: GeocodedPlace;
  importance: number;
  fromCityQuery: boolean;
}

const BOUNDS_FINGERPRINT_PRECISION = 3;

export function placeBoundsFingerprint(place: Pick<GeocodedPlace, "bounds">): string {
  const round = (value: number) => Number(value.toFixed(BOUNDS_FINGERPRINT_PRECISION));
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
  const winner = candidateQualityScore(right) > candidateQualityScore(left) ? right : left;

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

const FAR_HOMONYM_METERS = 500_000;

interface GeocodingRankScores {
  nameScore: number;
  containsScore: number;
  distanceScore: number;
  playableScore: number;
  fromCityQuery: boolean;
  areaSqMi: number;
  importance: number;
  settlementGrade: number;
  center: LatLngTuple;
}

function scoreGeocodedCandidate(
  candidate: RankedGeocodedPlaceCandidate,
  query: string,
  near?: LatLngTuple,
): GeocodingRankScores {
  return {
    nameScore: nameMatchScore(candidate.place.displayName, query),
    containsScore: containsUserScore(candidate.place, near),
    distanceScore: distanceToCenterScore(candidate.place, near),
    playableScore: playableSettlementScore(candidate.place.placeCategory),
    fromCityQuery: candidate.fromCityQuery,
    areaSqMi: candidate.place.approximateAreaSqMi,
    importance: candidate.importance,
    settlementGrade: settlementGradeScore(candidate.place.placeCategory),
    center: candidate.place.center,
  };
}

function compareGeocodingRankScores(left: GeocodingRankScores, right: GeocodingRankScores): number {
  const nameDelta = right.nameScore - left.nameScore;
  if (nameDelta !== 0) {
    return nameDelta;
  }

  const containsDelta = right.containsScore - left.containsScore;
  if (containsDelta !== 0) {
    return containsDelta;
  }

  const farHomonym = haversineMeters(left.center, right.center) > FAR_HOMONYM_METERS;
  if (farHomonym) {
    const importanceDelta = right.importance - left.importance;
    if (importanceDelta !== 0) {
      return importanceDelta;
    }
  }

  const playableDelta = right.playableScore - left.playableScore;
  if (playableDelta !== 0) {
    return playableDelta;
  }

  const distanceDelta = right.distanceScore - left.distanceScore;
  if (distanceDelta !== 0) {
    return distanceDelta;
  }

  const importanceDelta = right.importance - left.importance;
  if (importanceDelta !== 0) {
    return importanceDelta;
  }

  if (left.fromCityQuery !== right.fromCityQuery) {
    return left.fromCityQuery ? -1 : 1;
  }

  const gradeDelta = right.settlementGrade - left.settlementGrade;
  if (gradeDelta !== 0) {
    return gradeDelta;
  }

  return left.areaSqMi - right.areaSqMi;
}

export function rankGeocodedPlaceCandidates(
  candidates: RankedGeocodedPlaceCandidate[],
  query: string,
  near?: LatLngTuple,
): GeocodedPlace[] {
  return [...candidates]
    .map((candidate) => ({
      candidate,
      scores: scoreGeocodedCandidate(candidate, query, near),
    }))
    .sort((left, right) => compareGeocodingRankScores(left.scores, right.scores))
    .map(({ candidate }) => candidate.place);
}
