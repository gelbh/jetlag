import { useCallback, useState } from "react";
import {
  confirmAndRequestLocationAccess,
  type GeolocationReading,
  unknownGeolocationErrorMessage,
} from "../../services/core/location/geolocation";
import {
  getFreshLiveLocationReading,
  LIVE_LOCATION_FRESH_MS,
} from "../../services/core/location/liveLocationReading";

export function useGeolocation() {
  const [reading, setReading] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const live = getFreshLiveLocationReading();
      if (live) {
        setReading(live);
        return live;
      }

      const next = await confirmAndRequestLocationAccess({
        highAccuracy: false,
        maximumAge: LIVE_LOCATION_FRESH_MS,
      });
      setReading(next);
      return next;
    } catch (nextError) {
      const message = unknownGeolocationErrorMessage(nextError);
      setError(message);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    reading,
    error,
    loading,
    refresh,
  };
}
