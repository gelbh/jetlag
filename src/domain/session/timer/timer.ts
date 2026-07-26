import { formatClockDurationFromMs } from "../../time/formatClockDuration";

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

/** True when local UI or remote Firestore says the hiding timer is running. */
export function isHidingTimerEffectivelyRunning(
  localRunning: boolean,
  remoteRunning: boolean,
): boolean {
  return localRunning || remoteRunning;
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


/**
 * Pause local timer, adopting remote first when local is already paused but
 * remote is still running (deadline pause across host desync).
 */
export function pausePreferringRemote(
  local: TimerState,
  remote: TimerState | null | undefined,
  now = Date.now(),
): TimerState {
  const base =
    remote &&
    !isTimerRunning(local) &&
    isTimerRunning(remote)
      ? remote
      : local;
  return pauseTimer(base, now);
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

/** Pick authoritative timer state when local cache and Firestore diverge. */
export function reconcileTimerState(
  local: TimerState,
  remote: TimerState,
  now = Date.now(),
): TimerState {
  if (!hasTimerStarted(local) && !hasTimerStarted(remote)) {
    return { ...INITIAL_TIMER_STATE };
  }

  if (!hasTimerStarted(local)) {
    return remote;
  }

  if (!hasTimerStarted(remote)) {
    return local;
  }

  const localElapsed = computeElapsedMs(local, now);
  const remoteElapsed = computeElapsedMs(remote, now);
  const elapsedDiff = remoteElapsed - localElapsed;

  if (Math.abs(elapsedDiff) <= 2_000) {
    if (isTimerRunning(local) !== isTimerRunning(remote)) {
      // Prefer paused: resume is always an explicit start() write; do not
      // resurrect a still-running remote over a host pause in flight.
      return isTimerRunning(local) ? remote : local;
    }
    return local;
  }

  return remoteElapsed >= localElapsed ? remote : local;
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
