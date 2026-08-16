import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { haversineMeters } from "../../domain/geometry/gameArea/distance";
import {
  getCurrentPosition,
  queryGeolocationPermission,
  requestLocationAccess,
  unknownGeolocationErrorMessage,
  watchPosition,
  type GeolocationReading,
  LOCATION_BLOCKED_MESSAGE,
} from "../../services/core/location/geolocation";
import {
  getLocationPermissionUiSnapshot,
  retainLocationPermissionDemand,
  subscribeLocationPermissionUi,
} from "../../services/core/location/locationPermissionUi";

interface UseLiveLocationOptions {
  highAccuracy?: boolean;
  minIntervalMs?: number;
  minDistanceMeters?: number;
  /** Pass `0` for walk tracking so samples are not served from cache. */
  maximumAge?: number;
  /**
   * Optional getCurrentPosition poll while enabled. Helps when the browser
   * geolocation override updates but `watchPosition` stays quiet (e2e / some
   * mobile WebViews).
   */
  pollIntervalMs?: number;
}

export function useLiveLocation(
  enabled: boolean,
  options: UseLiveLocationOptions = {},
) {
  const {
    highAccuracy = false,
    minIntervalMs = 1500,
    minDistanceMeters = 5,
    maximumAge,
    pollIntervalMs,
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

  // Reset state when location tracking is disabled. This is a necessary cleanup
  // pattern — setState in effect is acceptable here since it only runs when enabled changes.
  useLayoutEffect(() => {
    if (enabled) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReading(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNeedsPermissionPrompt(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let stopWatch: (() => void) | undefined;
    let pollTimer: number | undefined;

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
          if (nextError.message === LOCATION_BLOCKED_MESSAGE) {
            setNeedsPermissionPrompt(false);
          }
        },
        { highAccuracy, maximumAge },
      );

      if (pollIntervalMs && pollIntervalMs > 0) {
        pollTimer = window.setInterval(() => {
          if (cancelled) {
            return;
          }
          void getCurrentPosition({ highAccuracy, maximumAge })
            .then((next) => {
              if (!cancelled) {
                publishReading(next);
              }
            })
            .catch(() => {
              // Watch errors surface via watchPosition; poll is best-effort.
            });
        }, pollIntervalMs);
      }
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

        // Map Allow CTA already obtained a reading under a user gesture.
        setNeedsPermissionPrompt(false);
        startWatch();
        return;
      }

      setNeedsPermissionPrompt(false);

      try {
        const initial = await requestLocationAccess({ highAccuracy, maximumAge });
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
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer);
      }
      lastPublishRef.current = null;
    };
  }, [
    confirmEpoch,
    enabled,
    highAccuracy,
    maximumAge,
    minDistanceMeters,
    minIntervalMs,
    pollIntervalMs,
  ]);

  return {
    reading: enabled ? reading : null,
    error: enabled ? error : null,
    needsPermissionPrompt: enabled ? needsPermissionPrompt : false,
  };
}
