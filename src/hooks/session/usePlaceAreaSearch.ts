import { useCallback, useEffect, useRef, useState } from "react";
import { createLoadTask, type LoadTask } from "@/services/core/progress/loadTask";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import {
  getCurrentPosition,
  queryGeolocationPermission,
  requestLocationAccess,
} from "../../services/core/location/geolocation";
import { type GeocodedPlace, searchPlacesSettled } from "../../services/geo/geocoding";
import { useLatestRequest } from "../forms/useLatestRequest";

interface UsePlaceAreaSearchOptions {
  initialQuery?: string;
  onPlaceApplied?: (place: GeocodedPlace) => void;
}

export function usePlaceAreaSearch(options: UsePlaceAreaSearchOptions = {}) {
  const { initialQuery = "", onPlaceApplied } = options;
  const [locationQuery, setLocationQueryState] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchTask, setSearchTask] = useState<LoadTask | null>(null);
  const userLocationRef = useRef<LatLngTuple | null>(null);
  const { beginRequest, isLatestRequest, requestSignal } = useLatestRequest();

  // Silent bias only when already granted — never trigger the system prompt on mount.
  useEffect(() => {
    void (async () => {
      const permission = await queryGeolocationPermission();
      if (permission !== "granted") {
        return;
      }
      try {
        const reading = await getCurrentPosition({ highAccuracy: false });
        userLocationRef.current = [reading.lat, reading.lng];
      } catch {
        userLocationRef.current = null;
      }
    })();
  }, []);

  const requestLocationBias = useCallback(() => {
    void requestLocationAccess({ highAccuracy: false, userGesture: true })
      .then((reading) => {
        userLocationRef.current = [reading.lat, reading.lng];
      })
      .catch(() => {
        userLocationRef.current = null;
      });
  }, []);

  const setLocationQuery = useCallback((value: string) => {
    setLocationQueryState(value);
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const applyPlace = useCallback(
    (place: GeocodedPlace) => {
      setSelectedPlaceId(place.id);
      setSelectedPlace(place);
      setLocationQueryState(place.displayName);
      setSearchError(null);
      onPlaceApplied?.(place);
    },
    [onPlaceApplied],
  );

  const handleSearch = useCallback(async () => {
    const trimmed = locationQuery.trim();
    if (trimmed.length < 2) {
      setSearchError("Enter a city, county, state, or country.");
      return;
    }

    const requestId = beginRequest();
    // A newer search aborts this task's signal, so a stale search never records its duration.
    const task = createLoadTask({ label: "Searching places", signal: requestSignal() });
    setSearchTask(task);
    setSearchLoading(true);
    setSearchError(null);

    const outcome = await searchPlacesSettled(trimmed, {
      near: userLocationRef.current ?? undefined,
      signal: task.signal,
      node: task.root,
    });
    if (task.signal.aborted) {
      task.cancel();
      if (isLatestRequest(requestId)) {
        setSearchLoading(false);
      }
      return;
    }
    if (outcome.ok) {
      task.complete();
    } else {
      task.fail();
    }
    if (!isLatestRequest(requestId)) {
      return;
    }
    setSearchLoading(false);
    if (!outcome.ok) {
      setSearchError(outcome.message);
      return;
    }
    if (outcome.places.length === 0) {
      setSearchResults([]);
      setSearchError("No matching places found. Try a more specific name.");
      return;
    }

    setSearchResults(outcome.places.length > 1 ? outcome.places : []);
    applyPlace(outcome.places[0]!);
  }, [applyPlace, beginRequest, isLatestRequest, locationQuery, requestSignal]);

  const resetSearch = useCallback(() => {
    setLocationQueryState("");
    setSearchResults([]);
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    setSearchError(null);
  }, []);

  return {
    locationQuery,
    setLocationQuery,
    searchResults,
    selectedPlaceId,
    selectedPlace,
    searchLoading,
    searchError,
    searchTask,
    handleSearch,
    applyPlace,
    resetSearch,
    requestLocationBias,
  };
}
