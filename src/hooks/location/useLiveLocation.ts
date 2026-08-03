import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { haversineMeters } from "../../domain/geometry/gameArea/distance";
import {
  confirmAndRequestLocationAccess,
  getLocationPermissionUiSnapshot,
  queryGeolocationPermission,
  requestLocationAccess,
  retainLocationPermissionDemand,
  subscribeLocationPermissionUi,
  unknownGeolocationErrorMessage,
  watchPosition,
  type GeolocationReading,
  LOCATION_BLOCKED_MESSAGE,
} from "../../services/core/location/geolocation";

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
  const [needsPermissionPrompt, setNeedsPermissionPrompt] = useState(false);
  const lastPublishRef = useRef<{ at: number; reading: GeolocationReading } | null>(
    null,
  );
  const confirmEpoch = useSyncExternalStore(
    subscribeLocationPermissionUi,
    () => getLocationPermissionUiSnapshot().confirmEpoch,
    () => 0,
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    return retainLocationPermissionDemand();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setReading(null);
      setError(null);
      setNeedsPermissionPrompt(false);
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

    const startWatch = () => {
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

    const start = async () => {
      const permission = await queryGeolocationPermission();
      if (cancelled) {
        return;
      }

      if (permission === "unavailable") {
        setNeedsPermissionPrompt(false);
        setError("Geolocation is not available on this device.");
        return;
      }

      if (permission === "denied") {
        setNeedsPermissionPrompt(false);
        setError(LOCATION_BLOCKED_MESSAGE);
        return;
      }

      if (permission === "prompt") {
        if (confirmEpoch === 0) {
          setNeedsPermissionPrompt(true);
          setError(null);
          return;
        }

        // CTA already ran getCurrentPosition under a user gesture — only watch.
        setNeedsPermissionPrompt(false);
        startWatch();
        return;
      }

      // granted
      setNeedsPermissionPrompt(false);

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

      startWatch();
    };

    void start();

    return () => {
      cancelled = true;
      stopWatch?.();
      lastPublishRef.current = null;
    };
  }, [confirmEpoch, enabled, highAccuracy, minDistanceMeters, minIntervalMs]);

  const requestPermission = useCallback(async () => {
    try {
      await confirmAndRequestLocationAccess({ highAccuracy });
      setNeedsPermissionPrompt(false);
      setError(null);
    } catch (nextError) {
      setNeedsPermissionPrompt(false);
      setError(unknownGeolocationErrorMessage(nextError));
    }
  }, [highAccuracy]);

  return {
    reading: enabled ? reading : null,
    error: enabled ? error : null,
    needsPermissionPrompt: enabled ? needsPermissionPrompt : false,
    requestPermission,
  };
}
