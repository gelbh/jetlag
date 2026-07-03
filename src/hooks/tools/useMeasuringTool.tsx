import {
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Feature,
  LineString,
  MultiPolygon,
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
  measuringMultiPlaceTargetLabel,
  measuringUsesAllPlacesInArea,
  usedMeasuringFromKinds,
  type MeasuringAnswer,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
  type MeasuringSubject,
  type MeasuringTargetMode,
} from "../../domain/measuringQuestions";
import type { DistanceUnit } from "../../domain/distance";
import { measuringLinearNotFoundMessage } from "../../services/measuringLinearFeatures";
import {
  fetchMeasuringPlacesInArea,
  measuringPlaceNotFoundMessage,
  type MeasuringPlace,
} from "../../services/measuringPlaces";
import { searchPlaces, type GeocodedPlace } from "../../services/geocoding";
import {
  fetchMeasuringCoastlineContext,
  fetchMeasuringLinearContext,
  fetchMeasuringMapTarget,
  fetchMeasuringSeaLevelContext,
  fetchNearestMeasuringPlace,
} from "./measuringToolResolvers";
import { useToolSessionOptions } from "./useToolSessionOptions";
import { MAP_ANNOTATION_COLORS } from "../../domain/mapAnnotationColors";

interface UseMeasuringToolParams {
  active: boolean;
  annotations: AnnotationRecord[];
  gameArea: GameArea;
  createAnnotation: (
    annotation: Omit<AnnotationRecord, "id" | "sessionId" | "status">,
  ) => Promise<AnnotationRecord>;
  distanceUnit: DistanceUnit;
  finishPlacement: () => void;
  gpsLoading: boolean;
  gpsError?: string | null;
  mapError: string | null;
  setMapError: (message: string | null) => void;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
}

export function useMeasuringTool({
  active,
  annotations,
  gameArea,
  createAnnotation,
  distanceUnit,
  finishPlacement,
  gpsLoading,
  gpsError,
  mapError,
  setMapError,
  refreshGps,
  ensurePointInGameArea,
}: UseMeasuringToolParams) {
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
  const [measuringSeaLevelNearRegion, setMeasuringSeaLevelNearRegion] =
    useState<Feature<GeoPolygon | MultiPolygon> | null>(null);
  const [measuringAnchorElevationMeters, setMeasuringAnchorElevationMeters] =
    useState<number | null>(null);
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

  useToolSessionOptions({
    active,
    usedOptions: usedMeasuringFromKindsSet,
    currentOption: measuringFromKind(
      measuringSubject,
      measuringLocationCategory,
    ),
    isAvailable: isMeasuringFromKindAvailable,
    pickNext: firstAvailableMeasuringFromKind,
    onUnavailable: useCallback((nextKind: MeasuringFromKind) => {
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
      setMeasuringTargetMode("map");
      setMeasuringSearchQuery("");
      setMeasuringSearchResults([]);
      setMeasuringSearchLoading(false);
      setMeasuringPlaces([]);
    }, []),
  });

  const measuringRegionInput = useMemo(
    () => ({
      gameArea,
      measuringSubject,
      measuringLocationCategory,
      measuringDistanceMeters,
      measuringAnswer,
      measuringTargetPoint,
      measuringPlaces,
      measuringCoastSegments,
      measuringSeaLevelNearRegion,
      usesAllPlacesInArea,
    }),
    [
      gameArea,
      measuringAnswer,
      measuringCoastSegments,
      measuringDistanceMeters,
      measuringLocationCategory,
      measuringPlaces,
      measuringSeaLevelNearRegion,
      measuringSubject,
      measuringTargetPoint,
      usesAllPlacesInArea,
    ],
  );

  const deferredRegionInput = useDeferredValue(measuringRegionInput);

  const measuringBoundaryPreview = useMemo(
    () => buildMeasuringBoundaryPreview(deferredRegionInput),
    [deferredRegionInput],
  );

  const measuringEliminationPreview = useMemo(
    () => buildMeasuringEliminationPreview(deferredRegionInput),
    [deferredRegionInput],
  );

  const setMeasuringSeekerAnchor = (
    point: LatLngTuple,
    placeName?: string | null,
  ) => {
    setMeasuringSeekerPoint(point);
    setMeasuringSeekerPlaceName(placeName ?? null);
    setMeasuringTargetPoint(null);
    setMeasuringTargetPlaceName(null);
    setMeasuringDistanceMeters(null);
    setMeasuringAnswer(null);
    setMeasuringError(null);
    setMeasuringCoastSegments([]);
    setMeasuringSeaLevelNearRegion(null);
    setMeasuringAnchorElevationMeters(null);
    setMeasuringPlaces([]);
    setMapError(null);

    if (measuringSubject === "sea_level") {
      void loadSeaLevelContextAt(point);
      return;
    }

    if (measuringUsesAllPlacesInArea(measureFromKind)) {
      void loadAllPlacesAt(point);
    }
  };

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

  const loadAllPlacesAt = async (
    seekerPoint: LatLngTuple,
    category: MeasuringLocationCategory = measuringLocationCategory,
  ) => {
    const requestId = ++placesRequestId.current;
    setMeasuringLoading(true);
    setMeasuringError(null);

    try {
      const places = await fetchMeasuringPlacesInArea(gameArea, category);

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
        error instanceof Error
          ? error.message
          : "Unable to load places in the play area.",
      );
    } finally {
      if (requestId === placesRequestId.current) {
        setMeasuringLoading(false);
      }
    }
  };

  const loadSeaLevelContextAt = async (seekerPoint: LatLngTuple) => {
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
        setMeasuringError(result.message);
        return;
      }

      setMeasuringAnchorElevationMeters(result.seekerElevationMeters);
      setMeasuringDistanceMeters(result.distanceFromSeaLevelMeters);
      setMeasuringSeaLevelNearRegion(result.nearRegion);
    } catch (error) {
      if (requestId !== seaLevelRequestId.current) {
        return;
      }

      setMeasuringSeaLevelNearRegion(null);
      setMeasuringAnchorElevationMeters(null);
      setMeasuringDistanceMeters(null);
      setMeasuringError(
        error instanceof Error ? error.message : "Unable to read elevation.",
      );
    } finally {
      if (requestId === seaLevelRequestId.current) {
        setMeasuringLoading(false);
      }
    }
  };

  const loadMeasuringCoastlineAt = async (seekerPoint: LatLngTuple) => {
    const requestId = ++coastlineRequestId.current;
    setMeasuringLoading(true);
    setMeasuringError(null);

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
        setMeasuringCoastSegments([]);
        setMeasuringError(result.message);
        return;
      }

      setMeasuringTargetPoint(result.coastPoint);
      setMeasuringDistanceMeters(result.distanceMeters);
      setMeasuringCoastSegments(result.segments);
    } catch (error) {
      if (requestId !== coastlineRequestId.current) {
        return;
      }

      setMeasuringTargetPoint(null);
      setMeasuringDistanceMeters(null);
      setMeasuringCoastSegments([]);
      setMeasuringError(
        error instanceof Error ? error.message : "Unable to find coastline.",
      );
    } finally {
      if (requestId === coastlineRequestId.current) {
        setMeasuringLoading(false);
      }
    }
  };

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
        error instanceof Error
          ? error.message
          : measuringLinearNotFoundMessage(kind),
      );
    } finally {
      if (requestId === linearRequestId.current) {
        setMeasuringLoading(false);
      }
    }
  };

  const resetDraft = (additionalUsedKind?: MeasuringFromKind) => {
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
    setMeasuringAnswer(null);
    setMeasuringError(null);
    setMeasuringPlaces([]);
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

    setMeasuringSeekerAnchor(point);
    return true;
  };

  const handleGps = async () => {
    setMeasuringError(null);

    try {
      const reading = await refreshGps();
      const point: LatLngTuple = [reading.lat, reading.lng];
      if (!ensurePointInGameArea(point)) {
        setMeasuringError("That point is outside the play area.");
        return;
      }

      setMeasuringSeekerAnchor(point);
    } catch (error) {
      setMeasuringError(
        error instanceof Error ? error.message : "Unable to read GPS location.",
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
          : "Unable to search for that place.",
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
      setMeasuringSeekerAnchor(place.center, place.displayName);
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
        error instanceof Error
          ? error.message
          : "Unable to find that venue on the map.",
      );
    } finally {
      setMeasuringLoading(false);
    }
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
        error instanceof Error
          ? error.message
          : "Unable to find the nearest place.",
      );
    } finally {
      setMeasuringLoading(false);
    }
  };

  const commit = async () => {
    if (
      !measuringSeekerPoint ||
      measuringDistanceMeters === null ||
      measuringAnswer === null
    ) {
      return;
    }

    const committedKind = measuringFromKind(
      measuringSubject,
      measuringLocationCategory,
    );
    if (
      !isMeasuringFromKindAvailable(usedMeasuringFromKindsSet, committedKind)
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

    const regions = buildMeasuringRegions(measuringRegionInput);
    if (!regions) {
      setMeasuringError("Unable to build measure distance regions.");
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
      ? measuringAnchorElevationMeters !== null
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
        setMeasuringTargetMode("map");
        setMeasuringSearchQuery("");
        setMeasuringSearchResults([]);
        setMeasuringSearchLoading(false);
        setMeasuringPlaces([]);
        if (measuringSeekerPoint && measuringUsesAllPlacesInArea(kind)) {
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
      onFindLinearFeature={() => {
        if (measuringSeekerPoint) {
          void loadMeasuringLinearAt(measuringSeekerPoint);
        }
      }}
      onFindNearest={() => void loadNearest()}
      onAnswerChange={setMeasuringAnswer}
      onCommit={() => void commit()}
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
    },
    placementCrosshair,
    handleMapClick,
    resetDraft,
    commit,
    panel,
  };
}
