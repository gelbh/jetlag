import { startTransition, useCallback, useEffect, useRef } from "react";
import type { GameArea } from "@/domain/map/annotations";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { distanceBetweenPoints } from "@/domain/geometry/gameArea/geometry";
import {
  isMeasuringLinearLocation,
  measuringFromKind,
  measuringMultiPlaceTargetLabel,
  measuringUsesAllPlacesInArea,
  applyMeasuringFromKind,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringTargetMode,
} from "@/domain/questions";
import type { SessionRulesInput } from "@/domain/session/rules";
import { manualPinAsMeasuringPlace } from "@/domain/session/catalog/sessionCustomCatalog";
import { poiCandidateToMeasuringPlace } from "@/domain/geo/poiCandidateAdapters";
import { measuringLinearNotFoundMessage } from "@/services/geo/overpass/measuringLinearFeatures";
import { overpassErrorMessage } from "@/services/core/overpass/overpassClient";
import {
  fetchMeasuringPlacesInArea,
  measuringPlaceNotFoundMessage,
} from "@/services/geo/overpass/measuringPlaces";
import { resolveCoastlineContextFromCache } from "@/services/geo/overpass/coastline";
import { previewBasemapPois } from "@/services/geo/maplibre/previewBasemapPois";
import { useMapStore } from "@/state/mapStore";
import { useDebouncedValue } from "../../forms/useDebouncedValue";
import {
  fetchMeasuringCoastlineContext,
  fetchMeasuringLinearContext,
  fetchMeasuringSeaLevelContext,
} from "../measuringToolResolvers";
import { ANCHOR_RESOLVE_DEBOUNCE_MS } from "./constants";
import { usesDebouncedSeekerResolve } from "./helpers";
import type { MeasuringDraftState } from "./useMeasuringDraftState";

interface UseMeasuringAnchorLoadersParams {
  active: boolean;
  gameArea: GameArea;
  sessionRules?: SessionRulesInput;
  setMapError: (message: string | null) => void;
  draft: MeasuringDraftState;
}

export function useMeasuringAnchorLoaders({
  active,
  gameArea,
  sessionRules,
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
    setMeasuringLoading,
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
  } = draft;

  const measuringAnswerRef = useRef(measuringAnswer);
  useEffect(() => {
    measuringAnswerRef.current = measuringAnswer;
  }, [measuringAnswer]);

  const placesApplyPhaseRef = useRef(new Map<number, number>());

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

      const pinPlaces = (sessionRules?.customLocationPins ?? []).map(
        manualPinAsMeasuringPlace,
      );
      const seen = new Set(fetchedPlaces.map((place) => place.id));
      const places = [
        ...fetchedPlaces,
        ...pinPlaces.filter((place) => !seen.has(place.id)),
      ];

      // Keep seeker answer + nearest target stable once chosen; enrich only refreshes the list.
      if (measuringAnswerRef.current !== null) {
        if (places.length > 0) {
          setMeasuringError(null);
          setMeasuringPlaces(places);
        }
        return;
      }

      if (places.length === 0) {
        setMeasuringPlaces([]);
        setMeasuringDistanceMeters(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringError(measuringPlaceNotFoundMessage(category));
        return;
      }

      let nearestDistance = Infinity;
      let nearestPlace = places[0];

      for (const place of places) {
        const distanceMeters = distanceBetweenPoints(seekerPoint, place.point);
        if (distanceMeters < nearestDistance) {
          nearestDistance = distanceMeters;
          nearestPlace = place;
        }
      }

      setMeasuringError(null);
      setMeasuringPlaces(places);
      setMeasuringDistanceMeters(nearestDistance);
      setMeasuringTargetPoint(nearestPlace.point);
      setMeasuringTargetPlaceName(
        measuringMultiPlaceTargetLabel(places.length, measureFromKind),
      );
    },
    [
      measureFromKind,
      placesRequestIdRef,
      sessionRules,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringPlaces,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
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
        applyAllPlacesResult(
          requestId,
          seekerPoint,
          category,
          tilePreview,
          0,
        );
      }

      try {
        const customCategories = sessionRules?.customCategories ?? [];
        const places = await fetchMeasuringPlacesInArea(
          gameArea,
          category,
          customCategories,
          sessionRules?.regionPackId,
          {
            onEnrich: (enrichedPlaces) => {
              applyAllPlacesResult(
                requestId,
                seekerPoint,
                category,
                enrichedPlaces,
                1,
              );
            },
          },
        );

        applyAllPlacesResult(requestId, seekerPoint, category, places, 0);
      } catch (error) {
        if (requestId !== placesRequestIdRef.current) {
          return;
        }

        setMeasuringPlaces([]);
        setMeasuringDistanceMeters(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringError(
          overpassErrorMessage(error, "Places in the play area didn't load."),
        );
      } finally {
        if (requestId === placesRequestIdRef.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [
      applyAllPlacesResult,
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

      try {
        const applySeaLevelOk = (
          result: Extract<
            Awaited<ReturnType<typeof fetchMeasuringSeaLevelContext>>,
            { ok: true }
          >,
        ) => {
          if (requestId !== seaLevelRequestIdRef.current) {
            return;
          }
          setMeasuringAnchorElevationMeters(result.seekerElevationMeters);
          setMeasuringDistanceMeters(result.distanceFromSeaLevelMeters);
          setMeasuringSeaLevelEdgeCase(result.edgeCase);
          setMeasuringSeaLevelNote(result.note);
          startTransition(() => {
            setMeasuringSeaLevelNearRegion(result.nearRegion);
          });
        };

        const result = await fetchMeasuringSeaLevelContext(
          seekerPoint,
          gameArea,
          {
            regionPackId: sessionRules?.regionPackId,
            onEnrich: (enriched) => {
              applySeaLevelOk(enriched);
            },
          },
        );

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

        applySeaLevelOk(result);
      } catch (error) {
        if (requestId !== seaLevelRequestIdRef.current) {
          return;
        }

        setMeasuringSeaLevelNearRegion(null);
        setMeasuringAnchorElevationMeters(null);
        setMeasuringDistanceMeters(null);
        setMeasuringSeaLevelEdgeCase(null);
        setMeasuringSeaLevelNote(null);
        setMeasuringError(
          error instanceof Error ? error.message : "Elevation unavailable.",
        );
      } finally {
        if (requestId === seaLevelRequestIdRef.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [
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

      const syncResult = resolveCoastlineContextFromCache(seekerPoint, gameArea);
      if (syncResult) {
        if (requestId !== coastlineRequestIdRef.current) {
          return;
        }

        startTransition(() => {
          setMeasuringTargetPoint(syncResult.coastPoint);
          setMeasuringDistanceMeters(syncResult.distanceMeters);
        });
        setMeasuringLoading(false);
        return;
      }

      try {
        const applyCoastlineOk = (result: {
          coastPoint: LatLngTuple;
          distanceMeters: number;
        }) => {
          if (requestId !== coastlineRequestIdRef.current) {
            return;
          }
          startTransition(() => {
            setMeasuringTargetPoint(result.coastPoint);
            setMeasuringDistanceMeters(result.distanceMeters);
            setCoastlineContextVersion((version) => version + 1);
          });
        };

        const result = await fetchMeasuringCoastlineContext(
          seekerPoint,
          gameArea,
          {
            regionPackId: sessionRules?.regionPackId,
            onEnrich: (enriched) => {
              applyCoastlineOk(enriched);
            },
          },
        );

        if (requestId !== coastlineRequestIdRef.current) {
          return;
        }

        if (!result.ok) {
          setMeasuringTargetPoint(null);
          setMeasuringDistanceMeters(null);
          setMeasuringError(result.message);
          return;
        }

        applyCoastlineOk(result);
      } catch (error) {
        if (requestId !== coastlineRequestIdRef.current) {
          return;
        }

        setMeasuringTargetPoint(null);
        setMeasuringDistanceMeters(null);
        setMeasuringError(
          overpassErrorMessage(error, "Coastline not found."),
        );
      } finally {
        if (requestId === coastlineRequestIdRef.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [
      coastlineRequestIdRef,
      gameArea,
      sessionRules,
      setCoastlineContextVersion,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringTargetPoint,
    ],
  );

  const loadMeasuringLinearAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const kind = measuringFromKind(measuringSubject, measuringLocationCategory);
      if (
        !isMeasuringLinearLocation(measuringSubject, measuringLocationCategory)
      ) {
        return;
      }

      const requestId = ++linearRequestIdRef.current;
      setMeasuringLoading(true);
      setMeasuringError(null);

      try {
        const result = await fetchMeasuringLinearContext(
          seekerPoint,
          gameArea,
          measuringSubject,
          measuringLocationCategory,
          customMeasureGeometries,
          customMatchingAreas,
          sessionRules?.regionPackId,
        );

        if (requestId !== linearRequestIdRef.current) {
          return;
        }

        if (!result.ok) {
          setMeasuringTargetPoint(null);
          setMeasuringTargetPlaceName(null);
          setMeasuringDistanceMeters(null);
          setMeasuringCoastSegments([]);
          setMeasuringError(result.message);
          return;
        }

        setMeasuringTargetPoint(result.point);
        setMeasuringTargetPlaceName(null);
        setMeasuringDistanceMeters(result.distanceMeters);
        setMeasuringCoastSegments(result.segments);
      } catch (error) {
        if (requestId !== linearRequestIdRef.current) {
          return;
        }

        setMeasuringTargetPoint(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringDistanceMeters(null);
        setMeasuringCoastSegments([]);
        setMeasuringError(
          overpassErrorMessage(error, measuringLinearNotFoundMessage(kind)),
        );
      } finally {
        if (requestId === linearRequestIdRef.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [
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

      if (measuringUsesAllPlacesInArea(measureFromKind)) {
        void loadAllPlacesAt(seekerPoint);
      }
    },
    [
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
      loadSeaLevelContextAt,
      measureFromKind,
      measuringSubject,
    ],
  );

  const resolveSeekerAnchorAtRef = useRef(resolveSeekerAnchorAt);

  useEffect(() => {
    resolveSeekerAnchorAtRef.current = resolveSeekerAnchorAt;
  }, [resolveSeekerAnchorAt]);

  const debouncedSeekerPoint = useDebouncedValue(
    measuringSeekerPoint,
    ANCHOR_RESOLVE_DEBOUNCE_MS,
  );

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
  }, [
    active,
    debouncedSeekerPoint,
    measureFromKind,
    measuringOptionChosen,
    measuringSubject,
  ]);

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

      if (measuringUsesAllPlacesInArea(nextKind)) {
        void loadAllPlacesAt(measuringSeekerPoint, next.locationCategory);
      }
    },
    [
      clearSubjectDerivedState,
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
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
      setMeasuringDistanceMeters(
        distanceBetweenPoints(measuringSeekerPoint, point),
      );
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

      if (
        measuringOptionChosen &&
        usesDebouncedSeekerResolve(measuringSubject, measureFromKind)
      ) {
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
      if (
        measuringOptionChosen &&
        usesDebouncedSeekerResolve(measuringSubject, measureFromKind)
      ) {
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
      setMeasuringOptionChosen(true);
      const next = applyMeasuringFromKind(kind);
      setMeasuringSubject(next.subject);
      setMeasuringLocationCategory(next.locationCategory);
      clearSubjectDerivedState();

      if (next.subject === "coastline" && measuringSeekerPoint) {
        void loadMeasuringCoastlineAt(measuringSeekerPoint);
      } else if (next.subject === "sea_level" && measuringSeekerPoint) {
        void loadSeaLevelContextAt(measuringSeekerPoint);
      } else if (measuringSeekerPoint && measuringUsesAllPlacesInArea(kind)) {
        void loadAllPlacesAt(measuringSeekerPoint, next.locationCategory);
      }
    },
    [
      clearSubjectDerivedState,
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
      loadSeaLevelContextAt,
      measuringSeekerPoint,
      setMeasuringLocationCategory,
      setMeasuringOptionChosen,
      setMeasuringSubject,
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
