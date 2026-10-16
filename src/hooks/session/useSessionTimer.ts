import { useCallback, useEffect, useRef, useState } from "react";
import { ANALYTICS_EVENTS } from "@/services/core/analytics/analyticsEvents";
import { trackLazy } from "@/services/core/analytics/lazyTelemetry";
import { serverNow } from "@/services/core/time/serverClock";
import {
  hasTimerStarted,
  INITIAL_TIMER_STATE,
  isTimerRunning,
  pausePreferringRemote,
  pauseTimer,
  reconcileTimerState,
  resetTimer,
  startTimer,
  type TimerState,
} from "../../domain/session/timer/timer";
import { emitHidingTimerStartedActivity } from "../../services/session/emitSessionActivity";
import { useTimerStore } from "../../state/timerStore";

interface UseSessionTimerOptions {
  canControl?: boolean;
  onControl?: (state: TimerState) => void;
  /** undefined = waiting for remote snapshot; null = local/host mode */
  remoteState?: TimerState | null | undefined;
  /** Firestore snapshot for host remount reconcile */
  remoteSnapshot?: TimerState | undefined;
  /** When this changes, clear local timer cache before reconciling remote */
  sessionResetAt?: string;
}

export function useSessionTimer(
  sessionId: string | undefined,
  options: UseSessionTimerOptions = {},
) {
  const {
    canControl = true,
    onControl,
    remoteState = null,
    remoteSnapshot,
    sessionResetAt,
  } = options;
  const getStoredTimer = useTimerStore((state) => state.getTimer);
  const setStoredTimer = useTimerStore((state) => state.setTimer);
  const clearStoredTimer = useTimerStore((state) => state.clearTimer);

  const [timerState, setTimerStateInternal] = useState<TimerState>(INITIAL_TIMER_STATE);
  const timerStateRef = useRef(timerState);
  const onControlRef = useRef(onControl);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  const lastSessionResetAtRef = useRef<string | undefined>(undefined);
  // Keeps game_started to once per session or reset; remote state can rewind to unstarted.
  const gameStartedTrackedRef = useRef(false);

  useEffect(() => {
    timerStateRef.current = timerState;
    onControlRef.current = onControl;
  }, [onControl, timerState]);

  const commitTimerState = useCallback(
    (next: TimerState) => {
      timerStateRef.current = next;
      setTimerStateInternal(next);
      if (sessionId) {
        setStoredTimer(sessionId, next);
      }
    },
    [sessionId, setStoredTimer],
  );

  useEffect(() => {
    if (!sessionId) {
      lastSessionIdRef.current = undefined;
      lastSessionResetAtRef.current = undefined;
      gameStartedTrackedRef.current = false;
      setTimerStateInternal(INITIAL_TIMER_STATE);
      return;
    }

    if (!canControl) {
      return;
    }

    const sessionChanged = lastSessionIdRef.current !== sessionId;
    if (sessionChanged) {
      lastSessionIdRef.current = sessionId;
      lastSessionResetAtRef.current = sessionResetAt;
      gameStartedTrackedRef.current = false;
    }

    const resetChanged =
      !sessionChanged &&
      sessionResetAt !== undefined &&
      sessionResetAt !== lastSessionResetAtRef.current;
    if (resetChanged) {
      lastSessionResetAtRef.current = sessionResetAt;
      gameStartedTrackedRef.current = false;
      clearStoredTimer(sessionId);
    }

    const local = resetChanged ? INITIAL_TIMER_STATE : getStoredTimer(sessionId);
    const next =
      remoteSnapshot !== undefined
        ? reconcileTimerState(local, remoteSnapshot, serverNow())
        : local;
    setTimerStateInternal(next);
    timerStateRef.current = next;
  }, [canControl, clearStoredTimer, getStoredTimer, remoteSnapshot, sessionId, sessionResetAt]);

  useEffect(() => {
    if (canControl || remoteState === null || remoteState === undefined) {
      return;
    }

    setTimerStateInternal(remoteState);
    timerStateRef.current = remoteState;

    if (sessionId) {
      setStoredTimer(sessionId, remoteState);
    }
  }, [canControl, remoteState, sessionId, setStoredTimer]);

  useEffect(() => {
    if (!sessionId || !canControl) {
      return;
    }

    return () => {
      if (!isTimerRunning(timerStateRef.current)) {
        return;
      }

      const paused = pauseTimer(timerStateRef.current, serverNow());
      setStoredTimer(sessionId, paused);
      onControlRef.current?.(paused);
    };
  }, [canControl, sessionId, setStoredTimer]);

  const start = useCallback(() => {
    if (!canControl) {
      return;
    }

    const current = timerStateRef.current;
    const next = startTimer(current, serverNow());
    if (next === current) {
      return;
    }
    commitTimerState(next);
    onControlRef.current?.(next);
    if (sessionId && !hasTimerStarted(current) && hasTimerStarted(next)) {
      emitHidingTimerStartedActivity(sessionId);
      if (!gameStartedTrackedRef.current) {
        gameStartedTrackedRef.current = true;
        trackLazy(ANALYTICS_EVENTS.game_started);
      }
    }
  }, [canControl, commitTimerState, sessionId]);

  const pause = useCallback(() => {
    if (!canControl) {
      return;
    }

    const remote = remoteSnapshot ?? (remoteState === null ? undefined : remoteState);
    const next = pausePreferringRemote(timerStateRef.current, remote, serverNow());
    commitTimerState(next);
    onControlRef.current?.(next);
  }, [canControl, commitTimerState, remoteSnapshot, remoteState]);

  const reset = useCallback(() => {
    if (!canControl) {
      return;
    }

    const next = resetTimer();
    gameStartedTrackedRef.current = false;
    commitTimerState(next);
    onControlRef.current?.(next);

    if (sessionId) {
      clearStoredTimer(sessionId);
    }
  }, [canControl, clearStoredTimer, commitTimerState, sessionId]);

  const applyRemoteState = useCallback(
    (state: TimerState) => {
      commitTimerState(state);
    },
    [commitTimerState],
  );

  return {
    running: isTimerRunning(timerState),
    hasStarted: hasTimerStarted(timerState),
    timerState,
    start,
    pause,
    reset,
    applyRemoteState,
  };
}

/** @deprecated Use useSessionTimer instead */
export function useGameTimer() {
  return useSessionTimer(undefined);
}
