import { useCallback, useState } from "react";
import {
  getCurrentPosition,
  unknownGeolocationErrorMessage,
  type GeolocationReading,
} from "../../services/core/geolocation";

export function useGeolocation() {
  const [reading, setReading] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const next = await getCurrentPosition();
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
