import { formatClockDurationFromMs } from "../time/formatClockDuration";

export type TimerState = {
  accumulatedMs: number;
  runningSince: number | null;
};

export const INITIAL_TIMER_STATE: TimerState = {
  accumulatedMs: 0,
  runningSince: null,
};

export function computeElapsedMs(
  state: TimerState,
  now = Date.now(),
): number {
  if (state.runningSince === null) {
    return Math.max(0, state.accumulatedMs);
  }

  return Math.max(0, state.accumulatedMs + (now - state.runningSince));
}

export function isTimerRunning(state: TimerState): boolean {
  return state.runningSince !== null;
}

export function hasTimerStarted(state: TimerState): boolean {
  return state.accumulatedMs > 0 || state.runningSince !== null;
}

export function startTimer(state: TimerState, now = Date.now()): TimerState {
  if (state.runningSince !== null) {
    return state;
  }

  return {
    accumulatedMs: state.accumulatedMs,
    runningSince: now,
  };
}

export function pauseTimer(state: TimerState, now = Date.now()): TimerState {
  if (state.runningSince === null) {
    return state;
  }

  return {
    accumulatedMs: computeElapsedMs(state, now),
    runningSince: null,
  };
}

export function resetTimer(): TimerState {
  return { ...INITIAL_TIMER_STATE };
}

export function timerStateFromRemote(
  accumulatedMs: number | undefined,
  runningSinceIso: string | null | undefined,
): TimerState {
  const accumulated = Math.max(0, accumulatedMs ?? 0);

  if (!runningSinceIso) {
    return {
      accumulatedMs: accumulated,
      runningSince: null,
    };
  }

  const runningSince = Date.parse(runningSinceIso);
  if (Number.isNaN(runningSince)) {
    return {
      accumulatedMs: accumulated,
      runningSince: null,
    };
  }

  return {
    accumulatedMs: accumulated,
    runningSince,
  };
}

export function timerStateToRemote(state: TimerState): {
  timerAccumulatedMs: number;
  timerRunningSince: string | null;
} {
  if (state.runningSince === null) {
    return {
      timerAccumulatedMs: state.accumulatedMs,
      timerRunningSince: null,
    };
  }

  return {
    timerAccumulatedMs: state.accumulatedMs,
    timerRunningSince: new Date(state.runningSince).toISOString(),
  };
}

export function formatElapsedTime(elapsedMs: number): string {
  return formatClockDurationFromMs(elapsedMs);
}
