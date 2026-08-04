import { useCallback, useState } from "react";
import {
  confirmAndRequestLocationAccess,
  unknownGeolocationErrorMessage,
  type GeolocationReading,
} from "../../services/core/location/geolocation";

export function useGeolocation() {
  const [reading, setReading] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Mark live-map GPS confirmed so map watches do not re-prompt after refresh.
      const next = await confirmAndRequestLocationAccess();
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
