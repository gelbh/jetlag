import { useEffect } from "react";
import { serverNow } from "@/services/core/time/serverClock";
import { isHidingPeriodActive } from "../../domain/session/hiding/hidingPeriod";
import type { SessionRulesInput } from "../../domain/session/rules";
import {
  computeElapsedMs,
  hasTimerStarted,
  type TimerState,
} from "../../domain/session/timer/timer";
import { emitSeekingStartedActivity } from "../../services/session/emitSessionActivity";

const SEEKING_STARTED_TICK_MS = 1_000;

export interface ShouldEmitSeekingStartedInput {
  canEmit: boolean;
  hasTimerStarted: boolean;
  sessionRules: SessionRulesInput;
  elapsedMs: number;
}

export function shouldEmitSeekingStarted(input: ShouldEmitSeekingStartedInput): boolean {
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
      const elapsedMs = computeElapsedMs(timerState, serverNow());
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
