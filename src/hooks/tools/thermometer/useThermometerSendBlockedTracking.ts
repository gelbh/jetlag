import { useEffect, useRef } from "react";
import type { ThermometerSendBlockReason } from "@/domain/questions";
import { ANALYTICS_EVENTS } from "@/services/core/analytics/analyticsEvents";
import { trackLazy } from "@/services/core/analytics/lazyTelemetry";
import type { ThermometerPlacementMode } from "./types";

export const THERMOMETER_GPS_WAIT_BLOCK_MS = 15_000;

export function useThermometerSendBlockedTracking({
  active,
  reason,
  placementMode,
  awaitHiderAnswer,
}: {
  active: boolean;
  reason: ThermometerSendBlockReason | null;
  placementMode: ThermometerPlacementMode;
  awaitHiderAnswer: boolean;
}): void {
  const trackedRef = useRef(new Set<ThermometerSendBlockReason>());
  const propsRef = useRef({ placementMode, awaitHiderAnswer });

  useEffect(() => {
    propsRef.current = { placementMode, awaitHiderAnswer };
  }, [placementMode, awaitHiderAnswer]);

  useEffect(() => {
    if (!active) {
      trackedRef.current.clear();
    }
  }, [active]);

  useEffect(() => {
    if (!active || reason === null || trackedRef.current.has(reason)) {
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        trackedRef.current.add(reason);
        trackLazy(ANALYTICS_EVENTS.thermometer_send_blocked, { reason, ...propsRef.current });
      },
      reason === "gps_waiting" ? THERMOMETER_GPS_WAIT_BLOCK_MS : 0,
    );

    return () => window.clearTimeout(timeoutId);
  }, [active, reason]);
}
