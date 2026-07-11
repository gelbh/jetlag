import { useDeferredValue, useMemo } from "react";
import type { GameArea } from "../../../domain/map/annotations";
import {
  buildMeasuringBoundaryPreview,
  buildMeasuringEliminationPreview,
} from "../../../domain/geometry/measuringRegions";
import { getCachedPreparedCoastlineSegments } from "../../../services/geo/coastline";
import type { MeasuringDraftState } from "./useMeasuringDraftState";

export function useMeasuringPreviews(
  gameArea: GameArea,
  draft: MeasuringDraftState,
) {
  const {
    measuringSubject,
    measuringLocationCategory,
    measuringDistanceMeters,
    measuringAnswer,
    measuringTargetPoint,
    measuringPlaces,
    measuringCoastSegments,
    measuringSeaLevelNearRegion,
    usesAllPlacesInArea,
    measuringSeaLevelEdgeCase,
    coastlineContextVersion,
  } = draft;

  const resolvedCoastSegments = useMemo(() => {
    if (measuringSubject === "coastline") {
      return getCachedPreparedCoastlineSegments(gameArea)?.segments ?? [];
    }

    return measuringCoastSegments;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- coastlineContextVersion busts coastline cache
  }, [
    coastlineContextVersion,
    gameArea,
    measuringCoastSegments,
    measuringSubject,
  ]);

  const measuringRegionInput = useMemo(
    () => ({
      gameArea,
      measuringSubject,
      measuringLocationCategory,
      measuringDistanceMeters,
      measuringAnswer,
      measuringTargetPoint,
      measuringPlaces,
      measuringCoastSegments: resolvedCoastSegments,
      measuringSeaLevelNearRegion,
      usesAllPlacesInArea,
    }),
    [
      gameArea,
      measuringAnswer,
      measuringDistanceMeters,
      measuringLocationCategory,
      measuringPlaces,
      measuringSeaLevelNearRegion,
      measuringSubject,
      measuringTargetPoint,
      resolvedCoastSegments,
      usesAllPlacesInArea,
    ],
  );

  const deferredDistanceMeters = useDeferredValue(measuringDistanceMeters);
  const deferredAnswer = useDeferredValue(measuringAnswer);

  const previewRegionInput = useMemo(
    () => ({
      ...measuringRegionInput,
      measuringDistanceMeters: deferredDistanceMeters,
      measuringAnswer: deferredAnswer,
    }),
    [deferredAnswer, deferredDistanceMeters, measuringRegionInput],
  );

  const measuringNearRegion = useMemo(() => {
    try {
      return buildMeasuringBoundaryPreview(previewRegionInput);
    } catch {
      return null;
    }
  }, [previewRegionInput]);

  const measuringBoundaryPreview = useMemo(() => {
    if (
      measuringSubject === "sea_level" &&
      measuringSeaLevelEdgeCase === "highest"
    ) {
      return null;
    }

    return measuringNearRegion;
  }, [measuringNearRegion, measuringSeaLevelEdgeCase, measuringSubject]);

  const measuringEliminationPreview = useMemo(() => {
    try {
      return buildMeasuringEliminationPreview({
        ...previewRegionInput,
        precomputedNearRegion: measuringNearRegion,
      });
    } catch {
      return null;
    }
  }, [measuringNearRegion, previewRegionInput]);

  return {
    resolvedCoastSegments,
    measuringRegionInput,
    measuringNearRegion,
    measuringBoundaryPreview,
    measuringEliminationPreview,
  };
}

export type MeasuringPreviews = ReturnType<typeof useMeasuringPreviews>;

export function useMeasuringPublishSignature(
  draft: MeasuringDraftState,
  previews: MeasuringPreviews,
  placementCrosshair: boolean,
) {
  const {
    coastlineContextVersion,
    measuringAnchorElevationMeters,
    measuringAnswer,
    measuringCoastSegments,
    measuringDistanceMeters,
    measuringError,
    measuringLoading,
    measuringLocationCategory,
    measuringPlaces,
    measuringSearchLoading,
    measuringSearchQuery,
    measuringSearchResults,
    measuringSeaLevelEdgeCase,
    measuringSeaLevelNote,
    measuringSeekerPlaceName,
    measuringSeekerPoint,
    measuringSubject,
    measuringTargetMode,
    measuringTargetPlaceName,
    measuringTargetPoint,
  } = draft;

  const { measuringBoundaryPreview, measuringEliminationPreview } = previews;

  return useMemo(
    () =>
      [
        measuringSeekerPoint?.[0],
        measuringSeekerPoint?.[1],
        measuringTargetPoint?.[0],
        measuringTargetPoint?.[1],
        measuringDistanceMeters,
        measuringLoading,
        measuringError,
        measuringAnswer,
        measuringSubject,
        measuringLocationCategory,
        measuringTargetMode,
        measuringSearchQuery,
        measuringSearchLoading,
        measuringSearchResults.length,
        measuringSeekerPlaceName,
        measuringTargetPlaceName,
        measuringAnchorElevationMeters,
        measuringSeaLevelEdgeCase,
        measuringSeaLevelNote,
        measuringPlaces.length,
        measuringCoastSegments.length,
        coastlineContextVersion,
        measuringBoundaryPreview
          ? JSON.stringify(measuringBoundaryPreview.geometry)
          : null,
        measuringEliminationPreview
          ? JSON.stringify(measuringEliminationPreview.geometry)
          : null,
        placementCrosshair,
      ].join("|"),
    [
      coastlineContextVersion,
      measuringAnchorElevationMeters,
      measuringAnswer,
      measuringBoundaryPreview,
      measuringCoastSegments.length,
      measuringDistanceMeters,
      measuringEliminationPreview,
      measuringError,
      measuringLoading,
      measuringLocationCategory,
      measuringPlaces.length,
      measuringSearchLoading,
      measuringSearchQuery,
      measuringSearchResults.length,
      measuringSeaLevelEdgeCase,
      measuringSeaLevelNote,
      measuringSeekerPlaceName,
      measuringSeekerPoint,
      measuringSubject,
      measuringTargetMode,
      measuringTargetPlaceName,
      measuringTargetPoint,
      placementCrosshair,
    ],
  );
}

export function useHasMeasuringTarget(draft: MeasuringDraftState) {
  const {
    measuringSubject,
    measuringAnchorElevationMeters,
    measuringSeaLevelNearRegion,
    usesAllPlacesInArea,
    measuringPlaces,
    measuringDistanceMeters,
    measuringTargetPoint,
  } = draft;

  return (
    measuringSubject === "sea_level"
      ? measuringAnchorElevationMeters !== null &&
          measuringSeaLevelNearRegion !== null
      : usesAllPlacesInArea
        ? measuringPlaces.length > 0 && measuringDistanceMeters !== null
        : measuringTargetPoint !== null
  );
}

export function useMeasuringPlacementCrosshair(
  active: boolean,
  draft: MeasuringDraftState,
) {
  const {
    measuringSeekerPoint,
    measuringSubject,
    usesAllPlacesInArea,
    measuringTargetMode,
    measuringTargetPoint,
  } = draft;

  return (
    active &&
    (measuringSeekerPoint === null ||
      (measuringSubject === "location" &&
        !usesAllPlacesInArea &&
        measuringTargetMode === "map" &&
        measuringTargetPoint === null))
  );
}
