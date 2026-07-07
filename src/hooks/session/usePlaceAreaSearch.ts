import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { getCurrentPosition } from "../../services/core/geolocation";
import {
  searchPlaces,
  type GeocodedPlace,
} from "../../services/geo/geocoding";

interface UsePlaceAreaSearchOptions {
  initialQuery?: string;
  onPlaceApplied?: (place: GeocodedPlace) => void;
}

export function usePlaceAreaSearch(options: UsePlaceAreaSearchOptions = {}) {
  const { initialQuery = "", onPlaceApplied } = options;
  const [locationQuery, setLocationQueryState] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<GeocodedPlace[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(
    null,
  );
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const userLocationRef = useRef<LatLngTuple | null>(null);

  useEffect(() => {
    void getCurrentPosition({ highAccuracy: false })
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
      setSearchResults([]);
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

    setSearchLoading(true);
    setSearchError(null);

    try {
      const results = await searchPlaces(
        trimmed,
        userLocationRef.current ? { near: userLocationRef.current } : undefined,
      );
      if (results.length === 0) {
        setSearchResults([]);
        setSearchError("No matching places found. Try a more specific name.");
        return;
      }

      if (results.length === 1) {
        applyPlace(results[0]);
        return;
      }

      setSearchResults(results);
    } catch (nextError) {
      setSearchError(
        nextError instanceof Error
          ? nextError.message
          : "Place search failed.",
      );
    } finally {
      setSearchLoading(false);
    }
  }, [applyPlace, locationQuery]);

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
    handleSearch,
    applyPlace,
    resetSearch,
  };
}
