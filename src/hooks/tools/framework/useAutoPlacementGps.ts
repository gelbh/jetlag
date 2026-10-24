import { useEffect, useRef, useState } from "react";
import {
  type GeolocationPermissionState,
  queryGeolocationPermission,
} from "../../../services/core/location/geolocation";

interface UseAutoPlacementGpsOptions<TKey> {
  eligible: boolean;
  /** Auto-GPS fires at most once per key (category, distance, measure-from). */
  entryKey: TKey;
  /** A seeker point is already placed; never overwrite it with GPS. */
  hasPoint: boolean;
  /** Must skip applying the reading when `shouldApply()` is false once GPS resolves. */
  requestGps: (shouldApply: () => boolean) => Promise<unknown>;
}

export function useAutoPlacementGps<TKey>({
  eligible,
  entryKey,
  hasPoint,
  requestGps,
}: UseAutoPlacementGpsOptions<TKey>): GeolocationPermissionState | "checking" {
  const [permission, setPermission] = useState<GeolocationPermissionState | "checking">("checking");
  const firedForKeyRef = useRef<TKey | null>(null);
  const hasPointRef = useRef(hasPoint);
  const requestGpsRef = useRef(requestGps);

  useEffect(() => {
    hasPointRef.current = hasPoint;
    requestGpsRef.current = requestGps;
  }, [hasPoint, requestGps]);

  useEffect(() => {
    if (!eligible) {
      firedForKeyRef.current = null;
      return;
    }

    let cancelled = false;
    void (async () => {
      const next = await queryGeolocationPermission();
      if (cancelled) {
        return;
      }
      setPermission(next);
      if (next === "granted" && !hasPointRef.current && firedForKeyRef.current !== entryKey) {
        firedForKeyRef.current = entryKey;
        void requestGpsRef.current(() => !hasPointRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eligible, entryKey]);

  return eligible ? permission : "checking";
}
