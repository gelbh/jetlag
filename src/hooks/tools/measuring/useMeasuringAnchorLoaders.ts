import { startTransition, useCallback, useEffect, useRef } from "react";
import type { GameArea } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import { distanceBetweenPoints } from "../../../domain/geometry/geometry";
import {
  isMeasuringLinearLocation,
  measuringFromKind,
  measuringMultiPlaceTargetLabel,
  measuringUsesAllPlacesInArea,
  applyMeasuringFromKind,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringTargetMode,
} from "../../../domain/questions";
import type { SessionRulesInput } from "../../../domain/session/sessionRules";
import { manualPinAsMeasuringPlace } from "../../../domain/session/sessionCustomCatalog";
import { measuringLinearNotFoundMessage } from "../../../services/geo/measuringLinearFeatures";
import { overpassErrorMessage } from "../../../services/core/overpassClient";
import {
  fetchMeasuringPlacesInArea,
  measuringPlaceNotFoundMessage,
} from "../../../services/geo/measuringPlaces";
import { resolveCoastlineContextFromCache } from "../../../services/geo/coastline";
import { useDebouncedValue } from "../../useDebouncedValue";
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

  const loadAllPlacesAt = useCallback(
    async (
      seekerPoint: LatLngTuple,
      category: MeasuringLocationCategory = measuringLocationCategory,
    ) => {
      const requestId = ++placesRequestIdRef.current;
      setMeasuringLoading(true);
      setMeasuringError(null);

      try {
        const customCategories = sessionRules?.customCategories ?? [];
        const overpassPlaces = await fetchMeasuringPlacesInArea(
          gameArea,
          category,
          customCategories,
          sessionRules?.regionPackId,
        );
        const pinPlaces = (sessionRules?.customLocationPins ?? []).map(
          manualPinAsMeasuringPlace,
        );
        const seen = new Set(overpassPlaces.map((place) => place.id));
        const places = [
          ...overpassPlaces,
          ...pinPlaces.filter((place) => !seen.has(place.id)),
        ];

        if (requestId !== placesRequestIdRef.current) {
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

        setMeasuringPlaces(places);
        setMeasuringDistanceMeters(nearestDistance);
        setMeasuringTargetPoint(nearestPlace.point);
        setMeasuringTargetPlaceName(
          measuringMultiPlaceTargetLabel(places.length, measureFromKind),
        );
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
      gameArea,
      measureFromKind,
      measuringLocationCategory,
      placesRequestIdRef,
      sessionRules,
      setMeasuringDistanceMeters,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringPlaces,
      setMeasuringTargetPlaceName,
      setMeasuringTargetPoint,
    ],
  );

  const loadSeaLevelContextAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const requestId = ++seaLevelRequestIdRef.current;
      setMeasuringLoading(true);
      setMeasuringError(null);

      try {
        const result = await fetchMeasuringSeaLevelContext(seekerPoint, gameArea);

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

        setMeasuringAnchorElevationMeters(result.seekerElevationMeters);
        setMeasuringDistanceMeters(result.distanceFromSeaLevelMeters);
        setMeasuringSeaLevelEdgeCase(result.edgeCase);
        setMeasuringSeaLevelNote(result.note);
        startTransition(() => {
          setMeasuringSeaLevelNearRegion(result.nearRegion);
        });
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
        const result = await fetchMeasuringCoastlineContext(
          seekerPoint,
          gameArea,
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

        startTransition(() => {
          setMeasuringTargetPoint(result.coastPoint);
          setMeasuringDistanceMeters(result.distanceMeters);
          setCoastlineContextVersion((version) => version + 1);
        });
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
