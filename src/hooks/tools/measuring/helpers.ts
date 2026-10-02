import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { MeasuringPlace } from "@/domain/geo/types";
import {
  measuringTargetKind,
  measuringUsesAllPlacesInArea,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
} from "@/domain/questions";

export function coastlineCommitReady(input: {
  measuringSubject: MeasuringSubject;
  measuringLoading: boolean;
  resolvedCoastSegmentsLength: number;
}): boolean {
  if (input.measuringLoading) {
    return false;
  }
  if (input.measuringSubject !== "coastline") {
    return true;
  }
  return input.resolvedCoastSegmentsLength > 0;
}

export function usesDebouncedSeekerResolve(
  subject: MeasuringSubject,
  kind: MeasuringFromKind,
): boolean {
  const targetKind = measuringTargetKind(kind);
  return (
    subject === "coastline" ||
    subject === "sea_level" ||
    measuringUsesAllPlacesInArea(kind) ||
    targetKind === "linear" ||
    targetKind === "polygon"
  );
}

/** Firestore region JSON: session supplies gameArea; placesJson is SoT for all-places. */
export function buildStoredMeasuringRegionInput(input: {
  measuringSubject: MeasuringSubject;
  measuringLocationCategory: MeasuringLocationCategory | null;
  measuringDistanceMeters: number | null;
  measuringTargetPoint: LatLngTuple | null;
  measuringPlaces: MeasuringPlace[];
  measuringCoastSegments: Feature<LineString>[];
  measuringSeaLevelNearRegion: Feature<Polygon | MultiPolygon> | null;
  usesAllPlacesInArea: boolean;
}) {
  return {
    measuringSubject: input.measuringSubject,
    measuringLocationCategory: input.measuringLocationCategory,
    measuringDistanceMeters: input.measuringDistanceMeters,
    measuringTargetPoint: input.measuringTargetPoint,
    measuringPlaces: input.usesAllPlacesInArea ? [] : input.measuringPlaces,
    measuringCoastSegments: input.measuringCoastSegments,
    measuringSeaLevelNearRegion: input.measuringSeaLevelNearRegion,
    usesAllPlacesInArea: input.usesAllPlacesInArea,
  };
}
