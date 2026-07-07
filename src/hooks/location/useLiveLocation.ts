import { useEffect, useRef, useState } from "react";
import {
  requestLocationAccess,
  unknownGeolocationErrorMessage,
  watchPosition,
  type GeolocationReading,
} from "../services/geolocation";

interface UseLiveLocationOptions {
  highAccuracy?: boolean;
  minIntervalMs?: number;
  minDistanceMeters?: number;
}

function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earthRadius = 6_371_000;
  const latDelta = ((b.lat - a.lat) * Math.PI) / 180;
  const lngDelta = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;

  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
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
        const moved = distanceMeters(last.reading, next);

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
