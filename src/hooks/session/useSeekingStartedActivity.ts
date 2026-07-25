import { useEffect } from "react";
import { isHidingPeriodActive } from "../../domain/session/hidingPeriod";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import {
  computeElapsedMs,
  hasTimerStarted,
  type TimerState,
} from "../../domain/session/timer";
import { emitSeekingStartedActivity } from "../../services/session/emitSessionActivity";

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

    const elapsedMs = computeElapsedMs(timerState);
    if (
      !shouldEmitSeekingStarted({
        canEmit,
        hasTimerStarted: hasTimerStarted(timerState),
        sessionRules,
        elapsedMs,
      })
    ) {
      return;
    }

    emitSeekingStartedActivity(sessionId);
  }, [canEmit, sessionId, sessionRules, timerState]);
}
