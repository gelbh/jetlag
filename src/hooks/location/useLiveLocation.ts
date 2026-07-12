import { useEffect, useRef, useState } from "react";
import { haversineMeters } from "../../domain/geometry/distance";
import {
  requestLocationAccess,
  unknownGeolocationErrorMessage,
  watchPosition,
  type GeolocationReading,
} from "../../services/core/geolocation";

interface UseLiveLocationOptions {
  highAccuracy?: boolean;
  minIntervalMs?: number;
  minDistanceMeters?: number;
}

export function useLiveLocation(
  enabled: boolean,
  options: UseLiveLocationOptions = {},
) {
  const {
    highAccuracy = false,
    minIntervalMs = 1500,
    minDistanceMeters = 5,
  } = options;
  const [reading, setReading] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastPublishRef = useRef<{ at: number; reading: GeolocationReading } | null>(
    null,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let stopWatch: (() => void) | undefined;

    const publishReading = (next: GeolocationReading, force = false) => {
      const now = Date.now();
      const last = lastPublishRef.current;

      if (!force && last) {
        const elapsed = now - last.at;
        const moved = haversineMeters(
          [last.reading.lat, last.reading.lng],
          [next.lat, next.lng],
        );

        if (elapsed < minIntervalMs && moved < minDistanceMeters) {
          return;
        }
      }

      lastPublishRef.current = { at: now, reading: next };
      setReading(next);
      setError(null);
    };

    const start = async () => {
      try {
        const initial = await requestLocationAccess({ highAccuracy });
        if (cancelled) {
          return;
        }

        publishReading(initial, true);
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

          publishReading(next);
        },
        (nextError) => {
          if (cancelled) {
            return;
          }

          setError(nextError.message);
        },
        { highAccuracy },
      );
    };

    void start();

    return () => {
      cancelled = true;
      stopWatch?.();
      lastPublishRef.current = null;
    };
  }, [enabled, highAccuracy, minDistanceMeters, minIntervalMs]);

  return {
    reading: enabled ? reading : null,
    error: enabled ? error : null,
  };
}
