import { useMemo } from "react";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import { isHidingPeriodActive } from "../../domain/session/hiding/hidingPeriod";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { TimerState } from "../../domain/session/timer/timer";
import { computeElapsedMs } from "../../domain/session/timer/timer";
import { distanceBetweenPoints } from "../../domain/geometry/geometry";

const MIN_GPS_BUFFER_METERS = 25;

interface UseHiderZoneAdvisoryParams {
  enabled: boolean;
  zone: HidingZoneRecord | null | undefined;
  location: { lat: number; lng: number } | null | undefined;
  accuracyMeters: number | null | undefined;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
}

export function useHiderZoneAdvisory({
  enabled,
  zone,
  location,
  accuracyMeters,
  sessionRules,
  timerState,
}: UseHiderZoneAdvisoryParams): boolean {
  return useMemo(() => {
    if (!enabled || !zone || zone.status !== "confirmed" || !location) {
      return false;
    }

    const elapsed = computeElapsedMs(timerState);
    if (isHidingPeriodActive(sessionRules, elapsed)) {
      return false;
    }

    const bufferMeters = Math.max(accuracyMeters ?? 0, MIN_GPS_BUFFER_METERS);
    const distance = distanceBetweenPoints(
      [location.lat, location.lng],
      [zone.center.lat, zone.center.lng],
    );

    return distance > zone.radiusMeters + bufferMeters;
  }, [
    accuracyMeters,
    enabled,
    location,
    sessionRules,
    timerState,
    zone,
  ]);
}
