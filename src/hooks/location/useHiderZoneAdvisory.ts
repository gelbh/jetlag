import { useLayoutEffect, useState } from "react";
import { serverNow } from "@/services/core/time/serverClock";
import { distanceBetweenPoints } from "../../domain/geometry/gameArea/geometry";
import { isHidingPeriodActive } from "../../domain/session/hiding/hidingPeriod";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import type { SessionRulesInput } from "../../domain/session/rules";
import { resolveHidingPeriodMs } from "../../domain/session/rules";
import type { TimerState } from "../../domain/session/timer/timer";
import { computeElapsedMs } from "../../domain/session/timer/timer";

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
  const [nowMs, setNowMs] = useState(() => serverNow());
  const { accumulatedMs, runningSince } = timerState;
  const hidingPeriodMs = resolveHidingPeriodMs(sessionRules);

  // One-shot wake at hiding end instead of a per-second tick: this hook runs at screen level.
  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }
    let timeout: number | undefined;
    const sync = () => {
      const now = serverNow();
      setNowMs(now);
      const remainingMs = hidingPeriodMs - computeElapsedMs({ accumulatedMs, runningSince }, now);
      if (runningSince !== null && remainingMs > 0) {
        timeout = window.setTimeout(sync, Math.max(1000, remainingMs));
      }
    };
    sync();
    return () => window.clearTimeout(timeout);
  }, [enabled, hidingPeriodMs, accumulatedMs, runningSince]);

  if (!enabled || !zone || zone.status !== "confirmed" || !location) {
    return false;
  }

  if (isHidingPeriodActive(sessionRules, computeElapsedMs(timerState, nowMs))) {
    return false;
  }

  const bufferMeters = Math.max(accuracyMeters ?? 0, MIN_GPS_BUFFER_METERS);
  const distance = distanceBetweenPoints(
    [location.lat, location.lng],
    [zone.center.lat, zone.center.lng],
  );

  return distance > zone.radiusMeters + bufferMeters;
}
