import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea } from "@/domain/map/annotations";
import {
  assertMeasuringGeometryBudget,
  persistSlimMeasuringGeometry,
} from "@/domain/geometry/measuring/measuringGeometryBudgets";
import {
  buildMeasuringCoarseFeature,
  refineMeasuringFeatureStep,
  type MeasuringLodPhase,
} from "@/domain/geometry/measuring/measuringLod";
import {
  buildMeasuringBoundaryPreview,
  buildMeasuringEliminationPreview,
} from "@/domain/geometry/measuring/measuringRegions";
import { previewGeometryFingerprint } from "@/domain/geometry/measuring/previewGeometryFingerprint";
import { getCachedPreparedCoastlineSegments } from "@/services/geo/overpass/coastline";
import type { MeasuringDraftState } from "./useMeasuringDraftState";

function scheduleIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(() => {
      callback();
    });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, 0);
  return () => clearTimeout(id);
}

function displayFeatureForComplete(
  full: Feature<GeoPolygon | MultiPolygon>,
  fallback: Feature<GeoPolygon | MultiPolygon>,
): Feature<GeoPolygon | MultiPolygon> {
  const slimmed = persistSlimMeasuringGeometry(full);
  return slimmed.ok ? slimmed.feature : fallback;
}

function paintLodFeature(
  full: Feature<GeoPolygon | MultiPolygon>,
  generation: number,
  generationRef: { current: number },
  setFeature: (
    feature: Feature<GeoPolygon | MultiPolygon> | null,
  ) => void,
  setPhase: (phase: MeasuringLodPhase) => void,
  cancelRef: { current: (() => void) | null },
): void {
  const coarse = buildMeasuringCoarseFeature(full);
  setFeature(coarse);

  if (previewGeometryFingerprint(coarse) === previewGeometryFingerprint(full)) {
    cancelRef.current = null;
    setFeature(displayFeatureForComplete(full, coarse));
    setPhase("complete");
    return;
  }

  setPhase("refining");
  let stepIndex = 0;
  let current = coarse;

  const runStep = () => {
    if (generation !== generationRef.current) {
      return;
    }
    const next = refineMeasuringFeatureStep(full, current, stepIndex);
    const previous = current;
    current = next.feature;
    setFeature(current);
    stepIndex += 1;
    if (next.done) {
      cancelRef.current = null;
      setFeature(displayFeatureForComplete(full, previous));
      setPhase("complete");
      return;
    }
    cancelRef.current = scheduleIdle(runStep);
  };

  cancelRef.current = scheduleIdle(runStep);
}

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
    setMeasuringError,
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

  const [measuringNearRegion, setMeasuringNearRegion] = useState<Feature<
    GeoPolygon | MultiPolygon
  > | null>(null);
  const [measuringEliminationPreview, setMeasuringEliminationPreview] =
    useState<Feature<GeoPolygon | MultiPolygon> | null>(null);
  const [measuringLodPhase, setMeasuringLodPhase] =
    useState<MeasuringLodPhase>("complete");
  const generationRef = useRef(0);
  const nearLodCancelRef = useRef<(() => void) | null>(null);
  const elimLodCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    nearLodCancelRef.current?.();
    nearLodCancelRef.current = null;
    elimLodCancelRef.current?.();
    elimLodCancelRef.current = null;

    const setSharedLodPhase = (phase: MeasuringLodPhase) => {
      if (phase === "coarse" || phase === "refining") {
        setMeasuringLodPhase(phase);
        return;
      }
      if (
        nearLodCancelRef.current === null &&
        elimLodCancelRef.current === null
      ) {
        setMeasuringLodPhase("complete");
        return;
      }
      setMeasuringLodPhase("refining");
    };

    const budget = assertMeasuringGeometryBudget({
      measuringSubject: previewRegionInput.measuringSubject,
      measuringLocationCategory: previewRegionInput.measuringLocationCategory,
      usesAllPlacesInArea: previewRegionInput.usesAllPlacesInArea,
      placeCount: previewRegionInput.measuringPlaces.length,
      linearSegments: previewRegionInput.measuringCoastSegments,
    });

    void (async () => {
      if (!budget.ok) {
        if (generation === generationRef.current) {
          setMeasuringNearRegion(null);
          setMeasuringEliminationPreview(null);
          setMeasuringLodPhase("complete");
          setMeasuringError(budget.message);
        }
        return;
      }

      let near: Feature<GeoPolygon | MultiPolygon> | null;
      try {
        near = await buildMeasuringBoundaryPreview(previewRegionInput);
      } catch {
        if (generation === generationRef.current) {
          setMeasuringNearRegion(null);
          setMeasuringEliminationPreview(null);
          setMeasuringLodPhase("complete");
        }
        return;
      }
      if (generation !== generationRef.current) {
        return;
      }

      // Clear stale elimination while the matching elim rebuild runs.
      setMeasuringEliminationPreview(null);
      setMeasuringError(null);

      if (near) {
        setMeasuringLodPhase("coarse");
        paintLodFeature(
          near,
          generation,
          generationRef,
          setMeasuringNearRegion,
          setSharedLodPhase,
          nearLodCancelRef,
        );
      } else {
        setMeasuringNearRegion(null);
        setSharedLodPhase("complete");
      }

      try {
        const elimination = await buildMeasuringEliminationPreview({
          ...previewRegionInput,
          precomputedNearRegion: near,
        });
        if (generation !== generationRef.current) {
          return;
        }
        if (!elimination) {
          setMeasuringEliminationPreview(null);
          setMeasuringError(null);
          setSharedLodPhase("complete");
          return;
        }
        paintLodFeature(
          elimination,
          generation,
          generationRef,
          setMeasuringEliminationPreview,
          setSharedLodPhase,
          elimLodCancelRef,
        );
        setMeasuringError(null);
      } catch {
        if (generation === generationRef.current) {
          setMeasuringEliminationPreview(null);
        }
      }
    })();

    return () => {
      generationRef.current += 1;
      nearLodCancelRef.current?.();
      nearLodCancelRef.current = null;
      elimLodCancelRef.current?.();
      elimLodCancelRef.current = null;
    };
  }, [previewRegionInput, setMeasuringError]);

  const measuringBoundaryPreview = useMemo(() => {
    if (
      measuringSubject === "sea_level" &&
      measuringSeaLevelEdgeCase === "highest"
    ) {
      return null;
    }

    return measuringNearRegion;
  }, [measuringNearRegion, measuringSeaLevelEdgeCase, measuringSubject]);

  return {
    resolvedCoastSegments,
    measuringRegionInput,
    measuringNearRegion,
    measuringBoundaryPreview,
    measuringEliminationPreview,
    measuringLodPhase,
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
    measuringOptionChosen,
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
        measuringOptionChosen,
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
          ? previewGeometryFingerprint(measuringBoundaryPreview)
          : null,
        measuringEliminationPreview
          ? previewGeometryFingerprint(measuringEliminationPreview)
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
      measuringOptionChosen,
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
