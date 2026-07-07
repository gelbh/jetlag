import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeElapsedMs,
  hasTimerStarted,
  INITIAL_TIMER_STATE,
  isTimerRunning,
  pauseTimer,
  resetTimer,
  startTimer,
  type TimerState,
} from "../../domain/session/timer";
import { useTimerStore } from "../../state/timerStore";

interface UseSessionTimerOptions {
  canControl?: boolean;
  onControl?: (state: TimerState) => void;
  /** undefined = waiting for remote snapshot; null = local/host mode */
  remoteState?: TimerState | null | undefined;
}

export function useSessionTimer(
  sessionId: string | undefined,
  options: UseSessionTimerOptions = {},
) {
  const { canControl = true, onControl, remoteState = null } = options;
  const getStoredTimer = useTimerStore((state) => state.getTimer);
  const setStoredTimer = useTimerStore((state) => state.setTimer);
  const clearStoredTimer = useTimerStore((state) => state.clearTimer);

  const [timerState, setTimerStateInternal] = useState<TimerState>(
    INITIAL_TIMER_STATE,
  );
  const timerStateRef = useRef(timerState);
  const onControlRef = useRef(onControl);

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
      /* eslint-disable react-hooks/set-state-in-effect -- reset when leaving a session */
      setTimerStateInternal(INITIAL_TIMER_STATE);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    if (!canControl) {
      return;
    }

    setTimerStateInternal(getStoredTimer(sessionId));
  }, [canControl, getStoredTimer, sessionId]);

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
    if (!sessionId || !isTimerRunning(timerStateRef.current)) {
      return;
    }

    return () => {
      const paused = pauseTimer(timerStateRef.current);
      setStoredTimer(sessionId, paused);
    };
  }, [sessionId, setStoredTimer]);

  const start = useCallback(() => {
    if (!canControl) {
      return;
    }

    setTimerState((current) => {
      const next = startTimer(current);
      onControlRef.current?.(next);
      return next;
    });
  }, [canControl, setTimerState]);

  const pause = useCallback(() => {
    if (!canControl) {
      return;
    }

    setTimerState((current) => {
      const next = pauseTimer(current);
      onControlRef.current?.(next);
      return next;
    });
  }, [canControl, setTimerState]);

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
