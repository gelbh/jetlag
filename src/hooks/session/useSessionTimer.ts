import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeElapsedMs,
  hasTimerStarted,
  INITIAL_TIMER_STATE,
  isTimerRunning,
  pausePreferringRemote,
  pauseTimer,
  reconcileTimerState,
  resetTimer,
  startTimer,
  type TimerState,
} from "../../domain/session/timer";
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

  const [timerState, setTimerStateInternal] = useState<TimerState>(
    INITIAL_TIMER_STATE,
  );
  const timerStateRef = useRef(timerState);
  const onControlRef = useRef(onControl);
  const lastSessionIdRef = useRef<string | undefined>(undefined);
  const lastSessionResetAtRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    timerStateRef.current = timerState;
    onControlRef.current = onControl;
  }, [onControl, timerState]);

  const setTimerState = useCallback(
    (next: TimerState | ((current: TimerState) => TimerState)) => {
      setTimerStateInternal((current) => {
        const resolved =
          typeof next === "function" ? next(current) : next;
        timerStateRef.current = resolved;

        if (sessionId) {
          setStoredTimer(sessionId, resolved);
        }

        return resolved;
      });
    },
    [sessionId, setStoredTimer],
  );

  useEffect(() => {
    if (!sessionId) {
      lastSessionIdRef.current = undefined;
      lastSessionResetAtRef.current = undefined;
      /* eslint-disable react-hooks/set-state-in-effect -- reset when leaving a session */
      setTimerStateInternal(INITIAL_TIMER_STATE);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    if (!canControl) {
      return;
    }

    const sessionChanged = lastSessionIdRef.current !== sessionId;
    if (sessionChanged) {
      lastSessionIdRef.current = sessionId;
      lastSessionResetAtRef.current = sessionResetAt;
    }

    const resetChanged =
      !sessionChanged &&
      sessionResetAt !== undefined &&
      sessionResetAt !== lastSessionResetAtRef.current;
    if (resetChanged) {
      lastSessionResetAtRef.current = sessionResetAt;
      clearStoredTimer(sessionId);
    }

    const local = resetChanged
      ? INITIAL_TIMER_STATE
      : getStoredTimer(sessionId);
    const next =
      remoteSnapshot !== undefined
        ? reconcileTimerState(local, remoteSnapshot)
        : local;
    setTimerStateInternal(next);
    timerStateRef.current = next;
  }, [
    canControl,
    clearStoredTimer,
    getStoredTimer,
    remoteSnapshot,
    sessionId,
    sessionResetAt,
  ]);

  useEffect(() => {
    if (canControl || remoteState === null || remoteState === undefined) {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- mirror host timer from Firestore */
    setTimerStateInternal(remoteState);
    /* eslint-enable react-hooks/set-state-in-effect */
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

      const paused = pauseTimer(timerStateRef.current);
      setStoredTimer(sessionId, paused);
      onControlRef.current?.(paused);
    };
  }, [canControl, sessionId, setStoredTimer]);

  const start = useCallback(() => {
    if (!canControl) {
      return;
    }

    setTimerState((current) => {
      const wasStarted = hasTimerStarted(current);
      const next = startTimer(current);
      onControlRef.current?.(next);
      if (sessionId && !wasStarted && hasTimerStarted(next)) {
        emitHidingTimerStartedActivity(sessionId);
      }
      return next;
    });
  }, [canControl, sessionId, setTimerState]);

  const pause = useCallback(() => {
    if (!canControl) {
      return;
    }

    const remote = remoteSnapshot ?? (remoteState === null ? undefined : remoteState);
    setTimerState((current) => {
      const next = pausePreferringRemote(current, remote);
      onControlRef.current?.(next);
      return next;
    });
  }, [canControl, remoteSnapshot, remoteState, setTimerState]);

  const reset = useCallback(() => {
    if (!canControl) {
      return;
    }

    const next = resetTimer();
    setTimerState(next);
    onControlRef.current?.(next);

    if (sessionId) {
      clearStoredTimer(sessionId);
    }
  }, [canControl, clearStoredTimer, sessionId, setTimerState]);

  const applyRemoteState = useCallback(
    (state: TimerState) => {
      setTimerState(state);
    },
    [setTimerState],
  );

  const elapsedMs = computeElapsedMs(timerState);

  return {
    elapsedMs,
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
