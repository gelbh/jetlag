import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import { MeasuringPanel } from "../../components/tools/MeasuringPanel";
import type { GameArea } from "../../domain/annotations";
import { isActive, type AnnotationRecord } from "../../domain/annotations";
import type { LatLngTuple } from "../../domain/geometry";
import { distanceBetweenPoints } from "../../domain/geometry";
import {
  buildMeasuringBoundaryPreview,
  buildMeasuringEliminationPreview,
  buildMeasuringRegions,
} from "../../domain/measuringRegions";
import {
  applyMeasuringFromKind,
  DEFAULT_MEASURING_FROM_KIND,
  firstAvailableMeasuringFromKind,
  isMeasuringFromKindAvailable,
  isMeasuringLinearLocation,
  measuringFromKind,
  measuringFromKindUseCount,
  measuringFromKindUseCountFromPending,
  measuringMultiPlaceTargetLabel,
  measuringUsesAllPlacesInArea,
  measuringQuestionFor,
  usedMeasuringFromKinds,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../domain/measuringQuestions";
import { questionCostBreakdown } from "../../domain/questionRules";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import type { DistanceUnit } from "../../domain/distance";
import type { SessionRulesInput } from "../../domain/sessionRules";
import { manualPinAsMeasuringPlace } from "../../domain/sessionCustomCatalog";
import { closerFurtherAnswerOptions } from "../../components/tools/shared/binaryAnswerOptions";
import type { SubmitPendingQuestionInput } from "../../hooks/usePendingQuestionActions";
import { useSubmitLock } from "../useSubmitLock";
import { measuringLinearNotFoundMessage } from "../../services/measuringLinearFeatures";
import { overpassErrorMessage } from "../../services/overpassClient";
import {
  fetchMeasuringPlacesInArea,
  measuringPlaceNotFoundMessage,
  type MeasuringPlace,
} from "../../services/measuringPlaces";
import { searchPlaces, type GeocodedPlace } from "../../services/geocoding";
import { getCachedPreparedCoastlineSegments, resolveCoastlineContextFromCache } from "../../services/coastline";
import { useDebouncedValue } from "../useDebouncedValue";
import {
  fetchMeasuringCoastlineContext,
  fetchMeasuringLinearContext,
  fetchMeasuringMapTarget,
  fetchMeasuringSeaLevelContext,
  fetchNearestMeasuringPlace,
} from "./measuringToolResolvers";
import { useToolSessionOptions } from "./useToolSessionOptions";
import type { SeaLevelEdgeCase } from "../../domain/seaLevel";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface UseMeasuringToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  pendingQuestions?: readonly PendingQuestionRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  awaitHiderAnswer?: boolean;
  submitPendingQuestion?: (
    input: Omit<
      SubmitPendingQuestionInput,
      "sessionId" | "senderUid" | "senderRole" | "toolType"
    >,
  ) => Promise<void>;
  sessionId?: string;
  senderUid?: string | null;
  sessionRules?: SessionRulesInput;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  setMapError: (message: string | null) => void;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
}

const ANCHOR_RESOLVE_DEBOUNCE_MS = 400;

function usesDebouncedSeekerResolve(
  subject: MeasuringSubject,
  kind: MeasuringFromKind,
): boolean {
  return (
    subject === "coastline" ||
    subject === "sea_level" ||
    measuringUsesAllPlacesInArea(kind)
  );
}

export function useMeasuringTool({
  active,
  annotations,
  pendingQuestions = [],
  gameArea,
  createAnnotation,
  awaitHiderAnswer = false,
  submitPendingQuestion,
  sessionId,
  senderUid,
  sessionRules,
  distanceUnit,
  finishPlacement,
  gpsLoading,
  gpsError,
  mapError,
  setMapError,
  refreshGps,
  ensurePointInGameArea,
}: UseMeasuringToolParams) {
  const { isSubmitting, runLocked } = useSubmitLock();
  const seaLevelRequestId = useRef(0);
  const coastlineRequestId = useRef(0);
  const linearRequestId = useRef(0);
  const placesRequestId = useRef(0);
  const usedMeasuringFromKindsSet = useMemo(
    () => usedMeasuringFromKinds(annotations.filter(isActive)),
    [annotations],
  );
  const [measuringSeekerPoint, setMeasuringSeekerPoint] =
    useState<LatLngTuple | null>(null);
  const [measuringTargetPoint, setMeasuringTargetPoint] =
    useState<LatLngTuple | null>(null);
  const [measuringSubject, setMeasuringSubject] =
    useState<MeasuringSubject>("location");
  const [measuringLocationCategory, setMeasuringLocationCategory] =
    useState<MeasuringLocationCategory>(DEFAULT_MEASURING_FROM_KIND);
  const [measuringDistanceMeters, setMeasuringDistanceMeters] = useState<
    number | null
  >(null);
  const [measuringAnswer, setMeasuringAnswer] =
    useState<MeasuringAnswer | null>(null);
  const [measuringLoading, setMeasuringLoading] = useState(false);
  const [measuringError, setMeasuringError] = useState<string | null>(null);
  const [measuringCoastSegments, setMeasuringCoastSegments] = useState<
    Feature<LineString>[]
  >([]);
  const [coastlineContextVersion, setCoastlineContextVersion] = useState(0);
  const [measuringSeaLevelNearRegion, setMeasuringSeaLevelNearRegion] =
    useState<Feature<GeoPolygon | MultiPolygon> | null>(null);
  const [measuringAnchorElevationMeters, setMeasuringAnchorElevationMeters] =
    useState<number | null>(null);
  const [measuringSeaLevelEdgeCase, setMeasuringSeaLevelEdgeCase] =
    useState<SeaLevelEdgeCase | null>(null);
  const [measuringSeaLevelNote, setMeasuringSeaLevelNote] = useState<
    string | null
  >(null);
  const [measuringTargetMode, setMeasuringTargetMode] =
    useState<MeasuringTargetMode>("map");
  const [measuringSeekerPlaceName, setMeasuringSeekerPlaceName] = useState<
    string | null
  >(null);
  const [measuringTargetPlaceName, setMeasuringTargetPlaceName] = useState<
    string | null
  >(null);
  const [measuringSearchQuery, setMeasuringSearchQuery] = useState("");
  const [measuringSearchResults, setMeasuringSearchResults] = useState<
    GeocodedPlace[]
  >([]);
  const [measuringSearchLoading, setMeasuringSearchLoading] = useState(false);
  const [measuringSearchRole, setMeasuringSearchRole] = useState<
    "seeker" | "target"
  >("seeker");
  const [measuringPlaces, setMeasuringPlaces] = useState<MeasuringPlace[]>([]);

  const measureFromKind = measuringFromKind(
    measuringSubject,
    measuringLocationCategory,
  );
  const usesAllPlacesInArea = measuringUsesAllPlacesInArea(measureFromKind);

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

  const measuringBoundaryPreview = measuringNearRegion;

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

  const debouncedSeekerPoint = useDebouncedValue(
    measuringSeekerPoint,
    ANCHOR_RESOLVE_DEBOUNCE_MS,
  );

  const setMeasuringTargetAnchor = (
    point: LatLngTuple,
    placeName?: string | null,
  ) => {
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
  };

  const loadAllPlacesAt = useCallback(
    async (
      seekerPoint: LatLngTuple,
      category: MeasuringLocationCategory = measuringLocationCategory,
    ) => {
      const requestId = ++placesRequestId.current;
      setMeasuringLoading(true);
      setMeasuringError(null);

      try {
        const customCategories = sessionRules?.customCategories ?? [];
        const overpassPlaces = await fetchMeasuringPlacesInArea(
          gameArea,
          category,
          customCategories,
        );
        const pinPlaces = (sessionRules?.customLocationPins ?? []).map(
          manualPinAsMeasuringPlace,
        );
        const seen = new Set(overpassPlaces.map((place) => place.id));
        const places = [
          ...overpassPlaces,
          ...pinPlaces.filter((place) => !seen.has(place.id)),
        ];

        if (requestId !== placesRequestId.current) {
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
        if (requestId !== placesRequestId.current) {
          return;
        }

        setMeasuringPlaces([]);
        setMeasuringDistanceMeters(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringError(
          overpassErrorMessage(error, "Places in the play area didn't load."),
        );
      } finally {
        if (requestId === placesRequestId.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [gameArea, measureFromKind, measuringLocationCategory, sessionRules],
  );

  const loadSeaLevelContextAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const requestId = ++seaLevelRequestId.current;
      setMeasuringLoading(true);
      setMeasuringError(null);

      try {
        const result = await fetchMeasuringSeaLevelContext(seekerPoint, gameArea);

        if (requestId !== seaLevelRequestId.current) {
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
        if (requestId !== seaLevelRequestId.current) {
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
        if (requestId === seaLevelRequestId.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [gameArea],
  );

  const loadMeasuringCoastlineAt = useCallback(
    async (seekerPoint: LatLngTuple) => {
      const requestId = ++coastlineRequestId.current;
      setMeasuringLoading(true);
      setMeasuringError(null);

      const syncResult = resolveCoastlineContextFromCache(seekerPoint, gameArea);
      if (syncResult) {
        if (requestId !== coastlineRequestId.current) {
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

        if (requestId !== coastlineRequestId.current) {
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
        if (requestId !== coastlineRequestId.current) {
          return;
        }

        setMeasuringTargetPoint(null);
        setMeasuringDistanceMeters(null);
        setMeasuringError(
          overpassErrorMessage(error, "Coastline not found."),
        );
      } finally {
        if (requestId === coastlineRequestId.current) {
          setMeasuringLoading(false);
        }
      }
    },
    [gameArea],
  );

  const loadMeasuringLinearAt = async (seekerPoint: LatLngTuple) => {
    const kind = measuringFromKind(measuringSubject, measuringLocationCategory);
    if (
      !isMeasuringLinearLocation(measuringSubject, measuringLocationCategory)
    ) {
      return;
    }

    const requestId = ++linearRequestId.current;
    setMeasuringLoading(true);
    setMeasuringError(null);

    try {
      const result = await fetchMeasuringLinearContext(
        seekerPoint,
        gameArea,
        measuringSubject,
        measuringLocationCategory,
      );

      if (requestId !== linearRequestId.current) {
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
      if (requestId !== linearRequestId.current) {
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
      if (requestId === linearRequestId.current) {
        setMeasuringLoading(false);
      }
    }
  };

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

  useEffect(() => {
    if (!active || !debouncedSeekerPoint) {
      return;
    }

    if (!usesDebouncedSeekerResolve(measuringSubject, measureFromKind)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      resolveSeekerAnchorAtRef.current(debouncedSeekerPoint);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [active, debouncedSeekerPoint, measureFromKind, measuringSubject]);

  const updateSeekerPosition = useCallback(
    (point: LatLngTuple, placeName?: string | null) => {
      setMeasuringSeekerPoint(point);
      setMeasuringSeekerPlaceName(placeName ?? null);
      setMeasuringAnswer(null);
      setMeasuringError(null);
      setMapError(null);

      if (usesDebouncedSeekerResolve(measuringSubject, measureFromKind)) {
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
    [measureFromKind, measuringSubject, setMapError],
  );

  const setMeasuringSeekerAnchorAndResolve = useCallback(
    (point: LatLngTuple, placeName?: string | null) => {
      updateSeekerPosition(point, placeName);
      if (usesDebouncedSeekerResolve(measuringSubject, measureFromKind)) {
        resolveSeekerAnchorAt(point);
      }
    },
    [measureFromKind, measuringSubject, resolveSeekerAnchorAt, updateSeekerPosition],
  );

  const handleUnavailableMeasuringOption = useCallback(
    (nextKind: MeasuringFromKind) => {
      const next = applyMeasuringFromKind(nextKind);
      setMeasuringSubject(next.subject);
      setMeasuringLocationCategory(next.locationCategory);
      setMeasuringTargetPoint(null);
      setMeasuringTargetPlaceName(null);
      setMeasuringDistanceMeters(null);
      setMeasuringAnswer(null);
      setMeasuringError(null);
      setMeasuringCoastSegments([]);
      setMeasuringSeaLevelNearRegion(null);
      setMeasuringAnchorElevationMeters(null);
      setMeasuringSeaLevelEdgeCase(null);
      setMeasuringSeaLevelNote(null);
      setMeasuringTargetMode("map");
      setMeasuringSearchQuery("");
      setMeasuringSearchResults([]);
      setMeasuringSearchLoading(false);
      setMeasuringPlaces([]);

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
      loadAllPlacesAt,
      loadMeasuringCoastlineAt,
      loadSeaLevelContextAt,
      measuringSeekerPoint,
    ],
  );

  useToolSessionOptions({
    active,
    usedOptions: usedMeasuringFromKindsSet,
    currentOption: measuringFromKind(
      measuringSubject,
      measuringLocationCategory,
    ),
    isAvailable: () => isMeasuringFromKindAvailable(),
    pickNext: firstAvailableMeasuringFromKind,
    onUnavailable: handleUnavailableMeasuringOption,
  });

  const resetDraft = useCallback((additionalUsedKind?: MeasuringFromKind) => {
    const usedKinds = new Set(usedMeasuringFromKindsSet);
    if (additionalUsedKind) {
      usedKinds.add(additionalUsedKind);
    }

    const nextKind =
      firstAvailableMeasuringFromKind(usedKinds) ?? DEFAULT_MEASURING_FROM_KIND;
    const next = applyMeasuringFromKind(nextKind);

    setMeasuringSeekerPoint(null);
    setMeasuringTargetPoint(null);
    setMeasuringSubject(next.subject);
    setMeasuringLocationCategory(next.locationCategory);
    setMeasuringTargetMode("map");
    setMeasuringSeekerPlaceName(null);
    setMeasuringTargetPlaceName(null);
    setMeasuringSearchQuery("");
    setMeasuringSearchResults([]);
    setMeasuringSearchLoading(false);
    setMeasuringSearchRole("seeker");
    setMeasuringDistanceMeters(null);
    setMeasuringCoastSegments([]);
    setMeasuringSeaLevelNearRegion(null);
    setMeasuringAnchorElevationMeters(null);
    setMeasuringSeaLevelEdgeCase(null);
    setMeasuringSeaLevelNote(null);
    setMeasuringAnswer(null);
    setMeasuringError(null);
    setMeasuringPlaces([]);
  }, [usedMeasuringFromKindsSet]);

  const handleGps = async () => {
    setMeasuringError(null);

    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        setMeasuringError("That point is outside the play area.");
        return;
      }

      setMeasuringSeekerAnchorAndResolve(point);
    } catch (error) {
      setMeasuringError(
        error instanceof Error ? error.message : "GPS location unavailable.",
      );
    }
  };

  const handleSearch = async (role: "seeker" | "target") => {
    const trimmed = measuringSearchQuery.trim();
    if (trimmed.length < 2) {
      setMeasuringError("Enter at least two characters to search.");
      return;
    }

    if (role === "target" && !measuringSeekerPoint) {
      setMeasuringError("Set your anchor before searching for a target.");
      return;
    }

    setMeasuringSearchRole(role);
    setMeasuringSearchLoading(true);
    setMeasuringError(null);

    try {
      const results = await searchPlaces(trimmed);
      if (results.length === 0) {
        setMeasuringSearchResults([]);
        setMeasuringError(
          "No matching places found. Try a more specific name.",
        );
        return;
      }

      setMeasuringSearchResults(results);
    } catch (error) {
      setMeasuringSearchResults([]);
      setMeasuringError(
        error instanceof Error
          ? error.message
          : "Place search failed.",
      );
    } finally {
      setMeasuringSearchLoading(false);
    }
  };

  const applySearchResult = (
    place: GeocodedPlace,
    role: "seeker" | "target",
  ) => {
    if (!ensurePointInGameArea(place.center)) {
      setMeasuringError("That place is outside the play area.");
      return;
    }

    setMeasuringSearchResults([]);
    setMeasuringSearchQuery(place.displayName);
    setMeasuringError(null);

    if (role === "seeker") {
      setMeasuringSeekerAnchorAndResolve(place.center, place.displayName);
      return;
    }

    setMeasuringTargetAnchor(place.center, place.displayName);
  };

  const resolveMeasuringMapTarget = async (point: LatLngTuple) => {
    if (!measuringSeekerPoint) {
      return;
    }

    if (
      measuringLocationCategory === "custom_place" ||
      (measuringLocationCategory as string) === "place"
    ) {
      setMeasuringTargetAnchor(point);
      return;
    }

    setMeasuringLoading(true);
    setMeasuringError(null);

    try {
      const nearest = await fetchMeasuringMapTarget(
        point,
        gameArea,
        measuringLocationCategory,
      );

      if (!nearest.ok) {
        setMeasuringError(nearest.message);
        return;
      }

      setMeasuringTargetAnchor(nearest.point, nearest.name);
    } catch (error) {
      setMeasuringError(
        overpassErrorMessage(error, "That venue wasn't found on the map."),
      );
    } finally {
      setMeasuringLoading(false);
    }
  };

  const handleMapClick = (point: LatLngTuple) => {
    if (!active) {
      return false;
    }

    if (
      measuringSubject === "location" &&
      !usesAllPlacesInArea &&
      measuringTargetMode === "map" &&
      measuringSeekerPoint &&
      !measuringTargetPoint
    ) {
      void resolveMeasuringMapTarget(point);
      return true;
    }

    setMeasuringSeekerAnchorAndResolve(point);
    return true;
  };

  const loadNearest = async () => {
    if (!measuringSeekerPoint) {
      return;
    }

    setMeasuringLoading(true);
    setMeasuringError(null);

    try {
      const nearest = await fetchNearestMeasuringPlace(
        measuringSeekerPoint,
        gameArea,
        measuringLocationCategory,
      );

      if (!nearest.ok) {
        setMeasuringTargetPoint(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringDistanceMeters(null);
        setMeasuringError(nearest.message);
        return;
      }

      setMeasuringTargetPoint(nearest.point);
      setMeasuringTargetPlaceName(nearest.name);
      setMeasuringDistanceMeters(nearest.distanceMeters);
      setMeasuringAnswer(null);
    } catch (error) {
      setMeasuringTargetPoint(null);
      setMeasuringTargetPlaceName(null);
      setMeasuringDistanceMeters(null);
      setMeasuringError(
        overpassErrorMessage(error, "Nearest place wasn't found."),
      );
    } finally {
      setMeasuringLoading(false);
    }
  };

  const commit = async () => {
    if (!measuringSeekerPoint || measuringDistanceMeters === null) {
      return;
    }

    const committedKind = measuringFromKind(
      measuringSubject,
      measuringLocationCategory,
    );
    if (
      !isMeasuringFromKindAvailable()
    ) {
      setMeasuringError("That measure category has already been added.");
      return;
    }

    if (
      measuringSubject !== "sea_level" &&
      !usesAllPlacesInArea &&
      !measuringTargetPoint
    ) {
      return;
    }

    if (usesAllPlacesInArea && measuringPlaces.length === 0) {
      return;
    }

    if (
      measuringSubject === "sea_level" &&
      !measuringSeaLevelNearRegion
    ) {
      setMeasuringError(
        measuringSeaLevelNote ??
          "Sea level region isn't ready yet. Wait for elevation sampling or tap Retry.",
      );
      return;
    }

    const locationCategory =
      measuringSubject === "location" ? measuringLocationCategory : undefined;
    const question = measuringQuestionFor(measuringSubject, locationCategory);

    if (awaitHiderAnswer && submitPendingQuestion && sessionId && senderUid) {
      const regionInputWithoutAnswer = {
        gameArea,
        measuringSubject,
        measuringLocationCategory,
        measuringDistanceMeters,
        measuringTargetPoint,
        measuringPlaces,
        measuringCoastSegments: resolvedCoastSegments,
        measuringSeaLevelNearRegion,
        usesAllPlacesInArea,
      };

      const geometry: Feature<Point> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: [measuringSeekerPoint[1], measuringSeekerPoint[0]],
        },
      };

      const metadata: Record<string, unknown> = {
        measuringSubject,
        measuringLocationCategory:
          measuringSubject === "location" ? measuringLocationCategory : undefined,
        measuringDistanceMeters,
        measuringAnchor: {
          lat: measuringSeekerPoint[0],
          lng: measuringSeekerPoint[1],
        },
        measuringAnchorAltitudeMeters:
          measuringSubject === "sea_level"
            ? (measuringAnchorElevationMeters ?? undefined)
            : undefined,
        measuringCoastPoint:
          measuringSubject === "sea_level"
            ? {
                lat: measuringSeekerPoint[0],
                lng: measuringSeekerPoint[1],
              }
            : measuringTargetPoint
              ? {
                  lat: measuringTargetPoint[0],
                  lng: measuringTargetPoint[1],
                }
              : undefined,
        measuringTargetName:
          measuringSubject === "sea_level"
            ? "Sea level"
            : (measuringTargetPlaceName ?? undefined),
        measuringRegionInputJson: JSON.stringify(regionInputWithoutAnswer),
      };

      if (usesAllPlacesInArea) {
        metadata.measuringPlacesJson = JSON.stringify(
          measuringPlaces.map((place) => ({
            id: place.id,
            name: place.name,
            lat: place.point[0],
            lng: place.point[1],
          })),
        );
      }

      const { draw: cardDraw, keep: cardKeep } = questionCostBreakdown(
        "D3P1",
        Math.max(
          measuringFromKindUseCount(annotations.filter(isActive), committedKind),
          measuringFromKindUseCountFromPending(pendingQuestions, committedKind),
        ),
      );

      await submitPendingQuestion({
        promptText: question.prompt,
        replyOptions: closerFurtherAnswerOptions.map((option) => ({
          id: option.value,
          label: option.label,
        })),
        placement: {
          geometryJson: JSON.stringify(geometry),
          metadata,
        },
        cardDraw,
        cardKeep,
      });

      resetDraft(committedKind);
      finishPlacement();
      return;
    }

    if (measuringAnswer === null) {
      return;
    }

    const regions = buildMeasuringRegions({
      ...measuringRegionInput,
      precomputedNearRegion: measuringNearRegion,
    });
    if (!regions) {
      setMeasuringError("Couldn't build measure distance regions.");
      return;
    }

    const { near: nearRegion, elimination } = regions;

    const metadata: AnnotationRecord["metadata"] = {
      createdAt: new Date().toISOString(),
      measuringSubject,
      measuringLocationCategory:
        measuringSubject === "location" ? measuringLocationCategory : undefined,
      measuringAnswer,
      measuringDistanceMeters,
      measuringAnchor: {
        lat: measuringSeekerPoint[0],
        lng: measuringSeekerPoint[1],
      },
      measuringAnchorAltitudeMeters:
        measuringSubject === "sea_level"
          ? (measuringAnchorElevationMeters ?? undefined)
          : undefined,
      measuringCoastPoint:
        measuringSubject === "sea_level"
          ? {
              lat: measuringSeekerPoint[0],
              lng: measuringSeekerPoint[1],
            }
          : measuringTargetPoint
            ? {
                lat: measuringTargetPoint[0],
                lng: measuringTargetPoint[1],
              }
            : undefined,
      measuringTargetName:
        measuringSubject === "sea_level"
          ? "Sea level"
          : (measuringTargetPlaceName ?? undefined),
      measuringBoundaryJson: JSON.stringify(nearRegion),
      color: MAP_ANNOTATION_COLORS.elimination,
    };

    if (usesAllPlacesInArea) {
      metadata.measuringPlacesJson = JSON.stringify(
        measuringPlaces.map((place) => ({
          id: place.id,
          name: place.name,
          lat: place.point[0],
          lng: place.point[1],
        })),
      );
    }

    await createAnnotation({
      type: "measuring",
      geometry: elimination,
      metadata,
    });

    resetDraft(committedKind);
    finishPlacement();
  };

  const hasMeasuringTarget =
    measuringSubject === "sea_level"
      ? measuringAnchorElevationMeters !== null &&
        measuringSeaLevelNearRegion !== null
      : usesAllPlacesInArea
        ? measuringPlaces.length > 0 && measuringDistanceMeters !== null
        : measuringTargetPoint !== null;

  const placementCrosshair =
    active &&
    (measuringSeekerPoint === null ||
      (measuringSubject === "location" &&
        !usesAllPlacesInArea &&
        measuringTargetMode === "map" &&
        measuringTargetPoint === null));

  const publishSignature = useMemo(
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

  const questionCost = useMemo(() => {
    const useCount = Math.max(
      measuringFromKindUseCount(annotations.filter(isActive), measureFromKind),
      measuringFromKindUseCountFromPending(pendingQuestions, measureFromKind),
    );
    return questionCostBreakdown("D3P1", useCount);
  }, [annotations, measureFromKind, pendingQuestions]);

  const panel = (
    <MeasuringPanel
      distanceUnit={distanceUnit}
      usedMeasuringFromKinds={usedMeasuringFromKindsSet}
      measureFrom={measuringFromKind(
        measuringSubject,
        measuringLocationCategory,
      )}
      subject={measuringSubject}
      targetMode={measuringTargetMode}
      usesAllPlacesInArea={usesAllPlacesInArea}
      hasSeekerPoint={measuringSeekerPoint !== null}
      hasTargetPoint={hasMeasuringTarget}
      anchorAltitudeMeters={measuringAnchorElevationMeters}
      seekerPlaceName={measuringSeekerPlaceName}
      targetPlaceName={measuringTargetPlaceName}
      distanceMeters={measuringDistanceMeters}
      loading={measuringLoading}
      gpsLoading={gpsLoading}
      searchQuery={measuringSearchQuery}
      searchResults={measuringSearchResults}
      searchLoading={measuringSearchLoading}
      searchRole={measuringSearchRole}
      answer={measuringAnswer}
      seaLevelEdgeCase={measuringSeaLevelEdgeCase}
      seaLevelNote={measuringSeaLevelNote}
      error={measuringError ?? gpsError ?? mapError}
      onMeasureFromChange={(kind) => {
        const next = applyMeasuringFromKind(kind);
        setMeasuringSubject(next.subject);
        setMeasuringLocationCategory(next.locationCategory);
        setMeasuringTargetPoint(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringDistanceMeters(null);
        setMeasuringAnswer(null);
        setMeasuringError(null);
        setMeasuringCoastSegments([]);
        setMeasuringSeaLevelNearRegion(null);
        setMeasuringAnchorElevationMeters(null);
        setMeasuringSeaLevelEdgeCase(null);
        setMeasuringSeaLevelNote(null);
        setMeasuringTargetMode("map");
        setMeasuringSearchQuery("");
        setMeasuringSearchResults([]);
        setMeasuringSearchLoading(false);
        setMeasuringPlaces([]);
        if (next.subject === "coastline" && measuringSeekerPoint) {
          void loadMeasuringCoastlineAt(measuringSeekerPoint);
        } else if (next.subject === "sea_level" && measuringSeekerPoint) {
          void loadSeaLevelContextAt(measuringSeekerPoint);
        } else if (measuringSeekerPoint && measuringUsesAllPlacesInArea(kind)) {
          void loadAllPlacesAt(measuringSeekerPoint, next.locationCategory);
        }
      }}
      onTargetModeChange={(mode) => {
        setMeasuringTargetMode(mode);
        setMeasuringTargetPoint(null);
        setMeasuringTargetPlaceName(null);
        setMeasuringDistanceMeters(null);
        setMeasuringAnswer(null);
        setMeasuringError(null);
      }}
      onSearchQueryChange={setMeasuringSearchQuery}
      onSearchSubmit={(role) => void handleSearch(role)}
      onSearchResultSelect={applySearchResult}
      onUseGps={() => void handleGps()}
      onFindCoastline={() => {
        if (measuringSeekerPoint) {
          void loadMeasuringCoastlineAt(measuringSeekerPoint);
        }
      }}
      onRetrySeaLevel={() => {
        if (measuringSeekerPoint) {
          void loadSeaLevelContextAt(measuringSeekerPoint);
        }
      }}
      onFindLinearFeature={() => {
        if (measuringSeekerPoint) {
          void loadMeasuringLinearAt(measuringSeekerPoint);
        }
      }}
      onFindNearest={() => void loadNearest()}
      onAnswerChange={(answer) => {
        startTransition(() => setMeasuringAnswer(answer));
      }}
      onCommit={() => void runLocked(commit)}
      awaitHiderAnswer={awaitHiderAnswer}
      costLabel={questionCost.label}
      isSubmitting={isSubmitting}
    />
  );

  return {
    draft: {
      measuringSeekerPoint,
      measuringTargetPoint,
      measuringPlaces,
      measuringDistanceMeters,
      measuringBoundaryPreview,
      measuringEliminationPreview,
      seekerResolving: measuringLoading && measuringSeekerPoint !== null,
    },
    placementCrosshair,
    publishSignature,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
