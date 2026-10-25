import { useCallback, useState } from "react";
import {
  confirmAndRequestLocationAccess,
  type GeolocationReading,
  unknownGeolocationErrorMessage,
} from "../../services/core/location/geolocation";
import {
  awaitFreshLiveLocationReading,
  getFreshLiveLocationReading,
  hasLiveLocationRetainers,
  LIVE_LOCATION_FRESH_MS,
  LIVE_WAIT_AFTER_TIMEOUT_MS,
  LIVE_WAIT_BEFORE_ONESHOT_MS,
} from "../../services/core/location/liveLocationReading";
import {
  getLocationPermissionUiSnapshot,
  hasPersistedLocationAccessConfirmed,
} from "../../services/core/location/locationPermissionUi";

/** Wait only when retainers exist and access was confirmed (CTA epoch or persist). */
function shouldAwaitLivePublish(): boolean {
  if (!hasLiveLocationRetainers()) {
    return false;
  }
  if (getLocationPermissionUiSnapshot().confirmEpoch > 0) {
    return true;
  }
  return hasPersistedLocationAccessConfirmed();
}

export function useGeolocation() {
  const [reading, setReading] = useState<GeolocationReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);

    const liveHit = getFreshLiveLocationReading();
    if (liveHit) {
      setReading(liveHit);
      return liveHit;
    }

    setLoading(true);

    const run = async () => {
      if (shouldAwaitLivePublish()) {
        const waited = await awaitFreshLiveLocationReading(LIVE_WAIT_BEFORE_ONESHOT_MS);
        if (waited) {
          setReading(waited);
          return waited;
        }
      }

      try {
        const next = await confirmAndRequestLocationAccess({
          highAccuracy: false,
          maximumAge: LIVE_LOCATION_FRESH_MS,
        });
        setReading(next);
        return next;
      } catch (nextError) {
        const message = unknownGeolocationErrorMessage(nextError);
        const isTimeout = message.toLowerCase().includes("timed out");
        if (isTimeout && shouldAwaitLivePublish()) {
          const recovered = await awaitFreshLiveLocationReading(LIVE_WAIT_AFTER_TIMEOUT_MS);
          if (recovered) {
            setError(null);
            setReading(recovered);
            return recovered;
          }
        }
        setError(message);
        throw nextError;
      }
    };

    return run().finally(() => {
      setLoading(false);
    });
  }, []);

  return {
    reading,
    error,
    loading,
    refresh,
  };
}
