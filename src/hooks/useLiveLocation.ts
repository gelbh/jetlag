import { useEffect, useState } from "react";
import {
  requestLocationAccess,
  unknownGeolocationErrorMessage,
  watchPosition,
  type GeolocationReading,
} from "../services/geolocation";

export function useLiveLocation(enabled: boolean) {
  const [reading, setReading] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let stopWatch: (() => void) | undefined;

    const start = async () => {
      try {
        const initial = await requestLocationAccess();
        if (cancelled) {
          return;
        }

        setReading(initial);
        setError(null);
      } catch (nextError) {
        if (cancelled) {
          return;
        }

        setError(unknownGeolocationErrorMessage(nextError));
        return;
      }

      if (cancelled) {
        return;
      }

      stopWatch = watchPosition(
        (next) => {
          if (cancelled) {
            return;
          }

          setReading(next);
          setError(null);
        },
        (nextError) => {
          if (cancelled) {
            return;
          }

          setError(nextError.message);
        },
      );
    };

    void start();

    return () => {
      cancelled = true;
      stopWatch?.();
    };
  }, [enabled]);

  return {
    reading: enabled ? reading : null,
    error: enabled ? error : null,
  };
}
