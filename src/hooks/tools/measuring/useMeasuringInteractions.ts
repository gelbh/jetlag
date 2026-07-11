import { useCallback } from "react";
import type { GameArea } from "../../../domain/map/annotations";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import { overpassErrorMessage } from "../../../services/core/overpassClient";
import { searchPlaces, type GeocodedPlace } from "../../../services/geo/geocoding";
import {
  fetchMeasuringMapTarget,
  fetchNearestMeasuringPlace,
} from "../measuringToolResolvers";
import type { MeasuringAnchorLoaders } from "./useMeasuringAnchorLoaders";
import type { MeasuringDraftState } from "./useMeasuringDraftState";
interface UseMeasuringInteractionsParams {
  active: boolean;
  gameArea: GameArea;
  refreshGps: () => Promise<{ lat: number; lng: number }>;
  ensurePointInGameArea: (point: LatLngTuple) => boolean;
  draft: MeasuringDraftState;
  loaders: MeasuringAnchorLoaders;
}

export function useMeasuringInteractions({
  active,
  gameArea,
  refreshGps,
  ensurePointInGameArea,
  draft,
  loaders,
}: UseMeasuringInteractionsParams) {
  const {
    wizardStepRef,
    measuringSubject,
    measuringLocationCategory,
    usesAllPlacesInArea,
    measuringSeekerPoint,
    measuringTargetPoint,
    measuringTargetMode,
    measuringSearchQuery,
    setMeasuringError,
    setMeasuringSearchRole,
    setMeasuringSearchLoading,
    setMeasuringSearchResults,
    setMeasuringSearchQuery,
    setMeasuringLoading,
    setMeasuringTargetPoint,
    setMeasuringTargetPlaceName,
    setMeasuringDistanceMeters,
    setMeasuringAnswer,
  } = draft;

  const { setMeasuringTargetAnchor, setMeasuringSeekerAnchorAndResolve } =
    loaders;

  const handleGps = useCallback(async () => {
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
  }, [
    ensurePointInGameArea,
    refreshGps,
    setMeasuringError,
    setMeasuringSeekerAnchorAndResolve,
  ]);

  const handleSearch = useCallback(
    async (role: "seeker" | "target") => {
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
          error instanceof Error ? error.message : "Place search failed.",
        );
      } finally {
        setMeasuringSearchLoading(false);
      }
    },
    [
      measuringSearchQuery,
      measuringSeekerPoint,
      setMeasuringError,
      setMeasuringSearchLoading,
      setMeasuringSearchResults,
      setMeasuringSearchRole,
    ],
  );

  const applySearchResult = useCallback(
    (place: GeocodedPlace, role: "seeker" | "target") => {
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
    },
    [
      ensurePointInGameArea,
      setMeasuringError,
      setMeasuringSearchQuery,
      setMeasuringSearchResults,
      setMeasuringSeekerAnchorAndResolve,
      setMeasuringTargetAnchor,
    ],
  );

  const resolveMeasuringMapTarget = useCallback(
    async (point: LatLngTuple) => {
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
    },
    [
      gameArea,
      measuringLocationCategory,
      measuringSeekerPoint,
      setMeasuringError,
      setMeasuringLoading,
      setMeasuringTargetAnchor,
    ],
  );

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!active) {
        return false;
      }

      const wizardStep = wizardStepRef.current;

      if (
        measuringSubject === "location" &&
        !usesAllPlacesInArea &&
        measuringTargetMode === "map" &&
        measuringSeekerPoint &&
        !measuringTargetPoint &&
        wizardStep === "target"
      ) {
        void resolveMeasuringMapTarget(point);
        return true;
      }

      if (wizardStep !== "anchor") {
        return false;
      }

      setMeasuringSeekerAnchorAndResolve(point);
      return true;
    },
    [
      active,
      measuringSeekerPoint,
      measuringSubject,
      measuringTargetMode,
      measuringTargetPoint,
      resolveMeasuringMapTarget,
      setMeasuringSeekerAnchorAndResolve,
      usesAllPlacesInArea,
      wizardStepRef,
    ],
  );

  const loadNearest = useCallback(async () => {
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
  }, [
    gameArea,
    measuringLocationCategory,
    measuringSeekerPoint,
    setMeasuringAnswer,
    setMeasuringDistanceMeters,
    setMeasuringError,
    setMeasuringLoading,
    setMeasuringTargetPlaceName,
    setMeasuringTargetPoint,
  ]);

  return {
    handleGps,
    handleSearch,
    applySearchResult,
    handleMapClick,
    loadNearest,
  };
}
