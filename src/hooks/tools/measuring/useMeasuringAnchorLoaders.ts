import type { Feature, LineString } from "geojson";
import { startTransition, useCallback, useEffect, useRef } from "react";
import { poiCandidateToMeasuringPlace } from "@/domain/geo/poiCandidateAdapters";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { distanceBetweenPoints } from "@/domain/geometry/gameArea/geometry";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import {
  applyMeasuringFromKind,
  isMeasuringLinearLocation,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringTargetMode,
  measuringFromKind,
  measuringLocationLabel,
  measuringUsesAllPlacesInArea,
} from "@/domain/questions";
import type { SessionRulesInput } from "@/domain/session/rules";
import { isAbortError } from "@/services/core/network/anySignal";
import { overpassErrorMessage } from "@/services/core/overpass/overpassClient";
import { createLoadTask, type LoadTask } from "@/services/core/progress/loadTask";
import { previewBasemapPois } from "@/services/geo/maplibre/previewBasemapPois";
import { resolveCoastlineContextFromCache } from "@/services/geo/overpass/coastline";
import { measuringLinearNotFoundMessage } from "@/services/geo/overpass/measuringLinearFeatures";
import {
  fetchMeasuringPlacesInArea,
  measuringPlaceNotFoundMessage,
} from "@/services/geo/overpass/measuringPlaces";
import { useMapStore } from "@/state/mapStore";
import { useDebouncedValue } from "../../forms/useDebouncedValue";
import {
  fetchMeasuringCoastlineContext,
  fetchMeasuringLinearContext,
  fetchMeasuringSeaLevelContext,
} from "../measuringToolResolvers";
import { resolveAllPlacesTarget } from "./allPlacesTarget";
import { ANCHOR_RESOLVE_DEBOUNCE_MS } from "./constants";
import { usesDebouncedSeekerResolve } from "./helpers";
import type { MeasuringDraftState } from "./useMeasuringDraftState";

interface UseMeasuringAnchorLoadersParams {
  active: boolean;
  gameArea: GameArea;
  sessionRules?: SessionRulesInput;
  /** Active annotations; tagged POI pins join the places list for their category. */
  annotations?: readonly AnnotationRecord[];
  setMapError: (message: string | null) => void;
  draft: MeasuringDraftState;
}

const NO_ANNOTATIONS: readonly AnnotationRecord[] = [];

export function useMeasuringAnchorLoaders({
  active,
  gameArea,
  sessionRules,
  annotations = NO_ANNOTATIONS,
  setMapError,
  draft,
}: UseMeasuringAnchorLoadersParams) {
  const {
    seaLevelRequestIdRef,
    coastlineRequestIdRef,
    linearRequestIdRef,
    placesRequestIdRef,
    measuringSubject,
    measuringLocationCategory,
    measureFromKind,
    measuringOptionChosen,
    measuringSeekerPoint,
    measuringAnswer,
    customMeasureGeometries,
    customMatchingAreas,
    usedMeasuringFromKindsSet,
    unavailableMeasuringFromKinds,
    setMeasuringLoading,
    setMeasuringLoadTask,
    setMeasuringError,
    setMeasuringPlaces,
    setMeasuringDistanceMeters,
    setMeasuringTargetPoint,
    setMeasuringTargetPlaceName,
    setMeasuringCoastSegments,
    setMeasuringSeaLevelNearRegion,
    setMeasuringAnchorElevationMeters,
    setMeasuringSeaLevelEdgeCase,
    setMeasuringSeaLevelNote,
    setCoastlineContextVersion,
    setMeasuringOptionChosen,
    setMeasuringSubject,
    setMeasuringLocationCategory,
    setMeasuringAnswer,
    setMeasuringTargetMode,
    setMeasuringSeekerPoint,
    setMeasuringSeekerPlaceName,
    clearSubjectDerivedState,
    setUnavailableMeasuringFromKinds,
    setCatalogNotice,
    reopenCatalog,
  } = draft;

  const measuringAnswerRef = useRef(measuringAnswer);
  useEffect(() => {
    measuringAnswerRef.current = measuringAnswer;
  }, [measuringAnswer]);

  const placesApplyPhaseRef = useRef(new Map<number, number>());

  // One measuring resolve runs at a time; a new one cancels the old so its fetch frees its slot.
  const loadTaskRef = useRef<LoadTask | null>(null);
  const beginLoadTask = useCallback(
    (label: string) => {
      loadTaskRef.current?.cancel();
      const task = createLoadTask({ label });
      loadTaskRef.current = task;
      setMeasuringLoadTask(task);
      return task;
    },
    [setMeasuringLoadTask],
  );
  useEffect(
    () => () => {
      loadTaskRef.current?.cancel();
    },
    [],
  );

  const applyAllPlacesResult = useCallback(
    (
      requestId: number,
      seekerPoint: LatLngTuple,
      category: MeasuringLocationCategory,
      fetchedPlaces: Awaited<ReturnType<typeof fetchMeasuringPlacesInArea>>,
      phase: 0 | 1,
    ) => {
      if (requestId !== placesRequestIdRef.current) {
        return;
      }

      const lastPhase = placesApplyPhaseRef.current.get(requestId) ?? -1;
      if (phase < lastPhase) {
        return;
      }
      placesApplyPhaseRef.current.set(requestId, phase);

      const target = resolveAllPlacesTarget({
        seekerPoint,
        fetched: fetchedPlaces,
        customLocationPins: sessionRules?.customLocationPins ?? [],
        annotations,
        category,
        kind: measureFromKind,
      });

      // Keep seeker answer + nearest target stable once chosen; enrich only refreshes the list.
      if (measuringAnswerRef.current !== null) {
        if (target) {
          setMeasuringError(null);
          setMeasuringPlaces(target.places);
        }
        return;
      }

      if (!target) {
        const notice = measuringPlaceNotFoundMessage(category);
        const kind = measuringFromKind("location", category);
        setUnavailableMeasuringFromKinds((prev) => {
          const next = new Map(prev);
          next.set(kind, notice);
          return next;
        });
        setCatalogNotice(notice);
        setMeasuringLoading(false);
        reopenCatalog();
        return;
      }

      setMeasuringError(null);
      setMeasuringPlaces(target.places);
      setMeasuringDistanceMeters(target.distanceMeters);
      setMeasuringTargetPoint(target.targetPoint);
      setMeasuringTargetPlaceName(target.targetName);
    },
    [
      annotations,
      measureFromKind,
      placesRequestIdRef,
      reopenCatalog,
      sessionRules,
      setCatalogNotice,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringPlaces,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
      setUnavailableMeasuringFromKinds,
    ],
  );

  const loadAllPlacesAt = useCallback(
    async (
      seekerPoint: LatLngTuple,
      category: MeasuringLocationCategory = measuringLocationCategory,
    ) => {
      const requestId = ++placesRequestIdRef.current;
      placesApplyPhaseRef.current.delete(requestId);
      setMeasuringLoading(true);
      setMeasuringError(null);

      const tilePreview = previewBasemapPois({
        mapStyle: useMapStore.getState().mapStyle,
        categoryIds: [category],
        maxResults: 48,
      }).map(poiCandidateToMeasuringPlace);
      if (tilePreview.length > 0) {
        applyAllPlacesResult(requestId, seekerPoint, category, tilePreview, 0);
      }

      const task = beginLoadTask("Loading places in the play area");
      try {
        const customCategories = sessionRules?.customCategories ?? [];
        const places = await fetchMeasuringPlacesInArea(
          gameArea,
          category,
          customCategories,
          sessionRules?.regionPackId,
          {
            task,
            createEnrichTask: () =>
              createLoadTask({ label: "Confirming places", signal: task.signal, global: true }),
            onEnrich: (enrichedPlaces) => {
              applyAllPlacesResult(requestId, seekerPoint, category, enrichedPlaces, 1);
            },
          },
        );

        task.complete();
        applyAllPlacesResult(requestId, seekerPoint, category, places, 0);
      } catch (error) {
        if (isAbortError(error)) {
          task.cancel();
        } else if (requestId === placesRequestIdRef.current) {
          task.fail(error);
          setMeasuringPlaces([]);
          setMeasuringDistanceMeters(null);
          setMeasuringTargetPlaceName(null);
          setMeasuringError(overpassErrorMessage(error, "Places in the play area didn't load."));
        }
      }
      if (requestId === placesRequestIdRef.current) {
        setMeasuringLoading(false);
      }
    },
    [
      applyAllPlacesResult,
      beginLoadTask,
      gameArea,
      measuringLocationCategory,
      placesRequestIdRef,
      sessionRules,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringPlaces,
      setMeasuringTargetPlaceName,
    ],
  );

  const loadSeaLevelContextAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const requestId = ++seaLevelRequestIdRef.current;
      setMeasuringLoading(true);
      setMeasuringError(null);
      const task = beginLoadTask("Reading elevation and shading the play area");

      try {
        const applySeaLevelResult = (
          result: Awaited<ReturnType<typeof fetchMeasuringSeaLevelContext>>,
        ) => {
          if (requestId !== seaLevelRequestIdRef.current) {
            return;
          }
          if (!result.ok) {
            setMeasuringSeaLevelNearRegion(null);
            setMeasuringAnchorElevationMeters(null);
            setMeasuringDistanceMeters(null);
            setMeasuringSeaLevelEdgeCase(null);
            setMeasuringSeaLevelNote(null);
            setMeasuringError(result.message);
            return;
          }
          setMeasuringError(null);
          setMeasuringAnchorElevationMeters(result.seekerElevationMeters);
          setMeasuringDistanceMeters(result.distanceFromSeaLevelMeters);
          setMeasuringSeaLevelEdgeCase(result.edgeCase);
          setMeasuringSeaLevelNote(result.note);
          startTransition(() => {
            setMeasuringSeaLevelNearRegion(result.nearRegion);
          });
        };

        const result = await fetchMeasuringSeaLevelContext(seekerPoint, gameArea, {
          task,
          regionPackId: sessionRules?.regionPackId,
          onEnrich: (enriched) => {
            applySeaLevelResult(enriched);
          },
        });

        task.complete();
        applySeaLevelResult(result);
      } catch (error) {
        if (isAbortError(error)) {
          task.cancel();
        } else if (requestId === seaLevelRequestIdRef.current) {
          task.fail(error);
          setMeasuringSeaLevelNearRegion(null);
          setMeasuringAnchorElevationMeters(null);
          setMeasuringDistanceMeters(null);
          setMeasuringSeaLevelEdgeCase(null);
          setMeasuringSeaLevelNote(null);
          setMeasuringError(error instanceof Error ? error.message : "Elevation unavailable.");
        }
      }
      if (requestId === seaLevelRequestIdRef.current) {
        setMeasuringLoading(false);
      }
    },
    [
      beginLoadTask,
      gameArea,
      seaLevelRequestIdRef,
      sessionRules,
      setMeasuringAnchorElevationMeters,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringSeaLevelEdgeCase,
      setMeasuringSeaLevelNearRegion,
      setMeasuringSeaLevelNote,
    ],
  );

  const loadMeasuringCoastlineAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const requestId = ++coastlineRequestIdRef.current;
      setMeasuringLoading(true);
      setMeasuringError(null);
      setMeasuringTargetPoint(null);
      setMeasuringDistanceMeters(null);
      setMeasuringCoastSegments([]);

      const syncResult = resolveCoastlineContextFromCache(seekerPoint, gameArea);
      if (syncResult) {
        if (requestId !== coastlineRequestIdRef.current) {
          return;
        }

        startTransition(() => {
          setMeasuringTargetPoint(syncResult.coastPoint);
          setMeasuringDistanceMeters(syncResult.distanceMeters);
          setMeasuringCoastSegments(syncResult.segments);
          setMeasuringLoading(false);
        });
        return;
      }

      const task = beginLoadTask("Finding coastline in the play area");
      try {
        const applyCoastlineOk = (result: {
          coastPoint: LatLngTuple;
          distanceMeters: number;
          segments: Feature<LineString>[];
        }) => {
          if (requestId !== coastlineRequestIdRef.current) {
            return;
          }
          startTransition(() => {
            setMeasuringTargetPoint(result.coastPoint);
            setMeasuringDistanceMeters(result.distanceMeters);
            setMeasuringCoastSegments(result.segments);
            setCoastlineContextVersion((version) => version + 1);
            setMeasuringLoading(false);
          });
        };

        const result = await fetchMeasuringCoastlineContext(seekerPoint, gameArea, {
          task,
          createEnrichTask: () =>
            createLoadTask({ label: "Confirming coastline", signal: task.signal, global: true }),
          regionPackId: sessionRules?.regionPackId,
          onEnrich: (enriched) => {
            applyCoastlineOk(enriched);
          },
        });

        task.complete();
        if (result.ok) {
          applyCoastlineOk(result);
        } else if (requestId === coastlineRequestIdRef.current) {
          setMeasuringTargetPoint(null);
          setMeasuringDistanceMeters(null);
          setMeasuringCoastSegments([]);
          setMeasuringError(result.message);
        }
      } catch (error) {
        if (isAbortError(error)) {
          task.cancel();
        } else if (requestId === coastlineRequestIdRef.current) {
          task.fail(error);
          setMeasuringTargetPoint(null);
          setMeasuringDistanceMeters(null);
          setMeasuringCoastSegments([]);
          setMeasuringError(overpassErrorMessage(error, "Coastline not found."));
        }
      }
      if (requestId === coastlineRequestIdRef.current) {
        setMeasuringLoading(false);
      }
    },
    [
      beginLoadTask,
      coastlineRequestIdRef,
      gameArea,
      sessionRules,
      setCoastlineContextVersion,
      setMeasuringCoastSegments,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringTargetPoint,
    ],
  );

  const loadMeasuringLinearAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const kind = measuringFromKind(measuringSubject, measuringLocationCategory);
      if (!isMeasuringLinearLocation(measuringSubject, measuringLocationCategory)) {
        return;
      }

      const requestId = ++linearRequestIdRef.current;
      setMeasuringLoading(true);
      setMeasuringError(null);
      const task = beginLoadTask(
        `Finding ${measuringLocationLabel(kind).toLowerCase()} in the play area`,
      );

      try {
        const result = await fetchMeasuringLinearContext(
          seekerPoint,
          gameArea,
          measuringSubject,
          measuringLocationCategory,
          customMeasureGeometries,
          customMatchingAreas,
          sessionRules?.regionPackId,
          task,
        );

        task.complete();
        if (requestId === linearRequestIdRef.current) {
          if (result.ok) {
            setMeasuringTargetPoint(result.point);
            setMeasuringTargetPlaceName(null);
            setMeasuringDistanceMeters(result.distanceMeters);
            setMeasuringCoastSegments(result.segments);
          } else {
            setMeasuringTargetPoint(null);
            setMeasuringTargetPlaceName(null);
            setMeasuringDistanceMeters(null);
            setMeasuringCoastSegments([]);
            setMeasuringError(result.message);
          }
        }
      } catch (error) {
        if (isAbortError(error)) {
          task.cancel();
        } else if (requestId === linearRequestIdRef.current) {
          task.fail(error);
          setMeasuringTargetPoint(null);
          setMeasuringTargetPlaceName(null);
          setMeasuringDistanceMeters(null);
          setMeasuringCoastSegments([]);
          setMeasuringError(overpassErrorMessage(error, measuringLinearNotFoundMessage(kind)));
        }
      }
      if (requestId === linearRequestIdRef.current) {
        setMeasuringLoading(false);
      }
    },
    [
      beginLoadTask,
      customMatchingAreas,
      customMeasureGeometries,
      gameArea,
      linearRequestIdRef,
      measuringLocationCategory,
      measuringSubject,
      sessionRules,
      setMeasuringCoastSegments,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
    ],
  );

  const resolveSeekerAnchorAt = useCallback(
    (seekerPoint: LatLngTuple) => {
      if (measuringSubject === "sea_level") {
        void loadSeaLevelContextAt(seekerPoint);
        return;
      }

      if (measuringSubject === "coastline") {
        void loadMeasuringCoastlineAt(seekerPoint);
        return;
      }

      if (isMeasuringLinearLocation(measuringSubject, measuringLocationCategory)) {
        void loadMeasuringLinearAt(seekerPoint);
        return;
      }

      if (measuringUsesAllPlacesInArea(measureFromKind)) {
        void loadAllPlacesAt(seekerPoint);
      }
    },
    [
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
      loadMeasuringLinearAt,
      loadSeaLevelContextAt,
      measureFromKind,
      measuringLocationCategory,
      measuringSubject,
    ],
  );

  const resolveSeekerAnchorAtRef = useRef(resolveSeekerAnchorAt);

  useEffect(() => {
    resolveSeekerAnchorAtRef.current = resolveSeekerAnchorAt;
  }, [resolveSeekerAnchorAt]);

  const debouncedSeekerPoint = useDebouncedValue(measuringSeekerPoint, ANCHOR_RESOLVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!active || !debouncedSeekerPoint || !measuringOptionChosen) {
      return;
    }

    if (!usesDebouncedSeekerResolve(measuringSubject, measureFromKind)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      resolveSeekerAnchorAtRef.current(debouncedSeekerPoint);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [active, debouncedSeekerPoint, measureFromKind, measuringOptionChosen, measuringSubject]);

  const handleUnavailableMeasuringOption = useCallback(
    (nextKind: MeasuringFromKind) => {
      const next = applyMeasuringFromKind(nextKind);
      setMeasuringOptionChosen(true);
      setMeasuringSubject(next.subject);
      setMeasuringLocationCategory(next.locationCategory);
      clearSubjectDerivedState();

      if (!measuringSeekerPoint) {
        return;
      }

      if (next.subject === "sea_level") {
        void loadSeaLevelContextAt(measuringSeekerPoint);
        return;
      }

      if (next.subject === "coastline") {
        void loadMeasuringCoastlineAt(measuringSeekerPoint);
        return;
      }

      if (isMeasuringLinearLocation(next.subject, next.locationCategory)) {
        void loadMeasuringLinearAt(measuringSeekerPoint);
        return;
      }

      if (measuringUsesAllPlacesInArea(nextKind)) {
        void loadAllPlacesAt(measuringSeekerPoint, next.locationCategory);
      }
    },
    [
      clearSubjectDerivedState,
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
      loadMeasuringLinearAt,
      loadSeaLevelContextAt,
      measuringSeekerPoint,
      setMeasuringLocationCategory,
      setMeasuringOptionChosen,
      setMeasuringSubject,
    ],
  );

  const setMeasuringTargetAnchor = useCallback(
    (point: LatLngTuple, placeName?: string | null) => {
      if (!measuringSeekerPoint) {
        return;
      }

      setMeasuringTargetPoint(point);
      setMeasuringTargetPlaceName(placeName ?? null);
      setMeasuringDistanceMeters(distanceBetweenPoints(measuringSeekerPoint, point));
      setMeasuringAnswer(null);
      setMeasuringError(null);
      setMapError(null);
    },
    [
      measuringSeekerPoint,
      setMapError,
      setMeasuringAnswer,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
    ],
  );

  const updateSeekerPosition = useCallback(
    (point: LatLngTuple, placeName?: string | null) => {
      setMeasuringSeekerPoint(point);
      setMeasuringSeekerPlaceName(placeName ?? null);
      setMeasuringAnswer(null);
      setMeasuringError(null);
      setMapError(null);

      if (measuringOptionChosen && usesDebouncedSeekerResolve(measuringSubject, measureFromKind)) {
        setMeasuringLoading(true);
        return;
      }

      setMeasuringTargetPoint(null);
      setMeasuringTargetPlaceName(null);
      setMeasuringDistanceMeters(null);
      setMeasuringCoastSegments([]);
      setMeasuringSeaLevelNearRegion(null);
      setMeasuringAnchorElevationMeters(null);
      setMeasuringSeaLevelEdgeCase(null);
      setMeasuringSeaLevelNote(null);
      setMeasuringPlaces([]);
    },
    [
      measureFromKind,
      measuringOptionChosen,
      measuringSubject,
      setMapError,
      setMeasuringAnchorElevationMeters,
      setMeasuringAnswer,
      setMeasuringCoastSegments,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringPlaces,
      setMeasuringSeaLevelEdgeCase,
      setMeasuringSeaLevelNearRegion,
      setMeasuringSeaLevelNote,
      setMeasuringSeekerPlaceName,
      setMeasuringSeekerPoint,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
    ],
  );

  const setMeasuringSeekerAnchorAndResolve = useCallback(
    (point: LatLngTuple, placeName?: string | null) => {
      updateSeekerPosition(point, placeName);
      if (measuringOptionChosen && usesDebouncedSeekerResolve(measuringSubject, measureFromKind)) {
        resolveSeekerAnchorAt(point);
      }
    },
    [
      measureFromKind,
      measuringOptionChosen,
      measuringSubject,
      resolveSeekerAnchorAt,
      updateSeekerPosition,
    ],
  );

  const handleMeasureFromChange = useCallback(
    (kind: MeasuringFromKind) => {
      if (usedMeasuringFromKindsSet.has(kind) || unavailableMeasuringFromKinds.has(kind)) {
        return;
      }
      setCatalogNotice(null);
      setMeasuringOptionChosen(true);
      const next = applyMeasuringFromKind(kind);
      setMeasuringSubject(next.subject);
      setMeasuringLocationCategory(next.locationCategory);
      clearSubjectDerivedState();

      if (next.subject === "coastline" && measuringSeekerPoint) {
        void loadMeasuringCoastlineAt(measuringSeekerPoint);
      } else if (next.subject === "sea_level" && measuringSeekerPoint) {
        void loadSeaLevelContextAt(measuringSeekerPoint);
      } else if (
        measuringSeekerPoint &&
        isMeasuringLinearLocation(next.subject, next.locationCategory)
      ) {
        void loadMeasuringLinearAt(measuringSeekerPoint);
      } else if (measuringSeekerPoint && measuringUsesAllPlacesInArea(kind)) {
        void loadAllPlacesAt(measuringSeekerPoint, next.locationCategory);
      }
    },
    [
      clearSubjectDerivedState,
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
      loadMeasuringLinearAt,
      loadSeaLevelContextAt,
      measuringSeekerPoint,
      setCatalogNotice,
      setMeasuringLocationCategory,
      setMeasuringOptionChosen,
      setMeasuringSubject,
      unavailableMeasuringFromKinds,
      usedMeasuringFromKindsSet,
    ],
  );

  const handleTargetModeChange = useCallback(
    (mode: MeasuringTargetMode) => {
      setMeasuringTargetMode(mode);
      setMeasuringTargetPoint(null);
      setMeasuringTargetPlaceName(null);
      setMeasuringDistanceMeters(null);
      setMeasuringAnswer(null);
      setMeasuringError(null);
    },
    [
      setMeasuringAnswer,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringTargetMode,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
    ],
  );

  return {
    loadAllPlacesAt,
    loadSeaLevelContextAt,
    loadMeasuringCoastlineAt,
    loadMeasuringLinearAt,
    resolveSeekerAnchorAt,
    handleUnavailableMeasuringOption,
    setMeasuringTargetAnchor,
    setMeasuringSeekerAnchorAndResolve,
    handleMeasureFromChange,
    handleTargetModeChange,
  };
}

export type MeasuringAnchorLoaders = ReturnType<typeof useMeasuringAnchorLoaders>;
