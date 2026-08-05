import type { TentaclePoi } from "@/domain/map/annotations";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import type { MatchingFeature, MeasuringPlace } from "@/domain/geo/types";
import {
  assertConfirmedForCommit,
  type PoiCandidate,
  type PoiConfirmStatus,
} from "@/domain/geo/poiCandidate";

export function measuringPlaceToPoiCandidate(
  place: MeasuringPlace,
  categoryId?: string,
): PoiCandidate {
  const confirmStatus: PoiConfirmStatus =
    place.confirmStatus ?? "confirmed";
  return {
    id: place.id,
    name: place.name,
    point: place.point,
    categoryId: place.categoryId ?? categoryId,
    source: place.source ?? (confirmStatus === "provisional" ? "tile" : "overpass"),
    confirmStatus,
    osmId: place.osmId,
  };
}

export function poiCandidateToMeasuringPlace(
  candidate: PoiCandidate,
): MeasuringPlace {
  return {
    id: candidate.id,
    name: candidate.name,
    point: candidate.point,
    categoryId: candidate.categoryId,
    source: candidate.source,
    confirmStatus: candidate.confirmStatus,
    osmId: candidate.osmId,
  };
}

export function tentaclePoiToPoiCandidate(poi: TentaclePoi): PoiCandidate {
  const confirmStatus: PoiConfirmStatus = poi.confirmStatus ?? "confirmed";
  return {
    id: poi.id,
    name: poi.name,
    point: [poi.lat, poi.lng],
    categoryId: poi.category,
    source: poi.source ?? (confirmStatus === "provisional" ? "tile" : "overpass"),
    confirmStatus,
    osmId: poi.osmId,
  };
}

export function poiCandidateToTentaclePoi(
  candidate: PoiCandidate,
  category: TentacleExtendedCategoryId,
): TentaclePoi {
  return {
    id: candidate.id,
    name: candidate.name,
    lat: candidate.point[0],
    lng: candidate.point[1],
    category: (candidate.categoryId as TentacleExtendedCategoryId) ?? category,
    source: candidate.source,
    confirmStatus: candidate.confirmStatus,
    osmId: candidate.osmId,
  };
}

export function matchingFeatureToPoiCandidate(
  feature: MatchingFeature,
  categoryId?: string,
): PoiCandidate {
  const confirmStatus: PoiConfirmStatus =
    feature.confirmStatus ?? "confirmed";
  return {
    id: feature.id,
    name: feature.name,
    point: feature.point,
    categoryId: feature.categoryId ?? categoryId,
    source:
      feature.source ?? (confirmStatus === "provisional" ? "tile" : "overpass"),
    confirmStatus,
    osmId: feature.osmId,
  };
}

export function poiCandidateToMatchingFeature(
  candidate: PoiCandidate,
): MatchingFeature {
  return {
    id: candidate.id,
    name: candidate.name,
    point: candidate.point,
    categoryId: candidate.categoryId,
    source: candidate.source,
    confirmStatus: candidate.confirmStatus,
    osmId: candidate.osmId,
  };
}

export function isConfirmedPoiLike(input: {
  confirmStatus?: PoiConfirmStatus;
  source?: PoiCandidate["source"];
}): boolean {
  return assertConfirmedForCommit({
    id: "check",
    name: "check",
    point: [0, 0],
    source: input.source ?? "overpass",
    confirmStatus: input.confirmStatus ?? "confirmed",
  });
}

export function filterConfirmedTentaclePois(
  pois: readonly TentaclePoi[],
): TentaclePoi[] {
  return pois.filter((poi) => isConfirmedPoiLike(poi));
}

export function filterConfirmedMeasuringPlaces(
  places: readonly MeasuringPlace[],
): MeasuringPlace[] {
  return places.filter((place) => isConfirmedPoiLike(place));
}
