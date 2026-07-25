import { useEffect } from "react";
import { isHidingPeriodActive } from "../../domain/session/hidingPeriod";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import {
  computeElapsedMs,
  hasTimerStarted,
  type TimerState,
} from "../../domain/session/timer";
import { emitSeekingStartedActivity } from "../../services/session/emitSessionActivity";

/** Poll while the timer is running so elapsed can cross the hiding boundary. */
const SEEKING_STARTED_TICK_MS = 1_000;

export interface ShouldEmitSeekingStartedInput {
  canEmit: boolean;
  hasTimerStarted: boolean;
  sessionRules: SessionRulesInput;
  elapsedMs: number;
}

/** Pure predicate for host/controller seeking_started emission. */
export function shouldEmitSeekingStarted(
  input: ShouldEmitSeekingStartedInput,
): boolean {
  return (
    input.canEmit &&
    input.hasTimerStarted &&
    !isHidingPeriodActive(input.sessionRules, input.elapsedMs)
  );
}

interface UseSeekingStartedActivityParams {
  sessionId: string | undefined;
  canEmit: boolean;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
}

/**
 * Host/controller-only: append fixed `seeking_started` once when the hiding
 * period has elapsed. Non-controlling clients only read the log.
 *
 * While `runningSince` is set, elapsed grows without `timerState` identity
 * changes, so we tick every second to recompute and emit when due.
 */
export function useSeekingStartedActivity({
  sessionId,
  canEmit,
  sessionRules,
  timerState,
}: UseSeekingStartedActivityParams): void {
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const tryEmit = (): boolean => {
      const elapsedMs = computeElapsedMs(timerState);
      if (
        !shouldEmitSeekingStarted({
          canEmit,
          hasTimerStarted: hasTimerStarted(timerState),
          sessionRules,
          elapsedMs,
        })
      ) {
        return false;
      }

      emitSeekingStartedActivity(sessionId);
      return true;
    };

    if (tryEmit()) {
      return;
    }

    // Paused / not started: elapsed is stable until timerState changes.
    if (timerState.runningSince === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (tryEmit()) {
        window.clearInterval(intervalId);
      }
    }, SEEKING_STARTED_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [canEmit, sessionId, sessionRules, timerState]);
}
