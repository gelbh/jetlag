/** Fraction a timed stage shows when its expected duration has elapsed. */
export const TIMED_KNEE_FRACTION = 0.9;
/** Ceiling a timed stage approaches but never reaches before `finish()`. */
export const TIMED_CEILING_FRACTION = 0.99;
/** Floor for expected durations so a zero prior never divides by zero. */
export const MIN_EXPECTED_MS = 50;
/** EMA weight of the newest rate sample. */
export const RATE_EMA_ALPHA = 0.3;
/** Rate samples a counted stage needs before its ETA is trusted. */
export const RATE_WARMUP_SAMPLES = 3;
/** Task age before an ETA is shown when no counted stage has warmed up. */
export const ETA_WARMUP_MS = 1_500;
/** Task is overdue once elapsed exceeds this multiple of its expected total. */
export const OVERDUE_FACTOR = 1.5;
const ETA_RELATIVE_HYSTERESIS = 0.2;
const ETA_ABSOLUTE_HYSTERESIS_MS = 3_000;

export function clampExpectedMs(expectedMs: number): number {
  return Number.isFinite(expectedMs) ? Math.max(MIN_EXPECTED_MS, expectedMs) : MIN_EXPECTED_MS;
}

/** Progress of uncountable work: linear to 90% at `expectedMs`, then asymptotic toward 99%. */
export function timedFraction(elapsedMs: number, expectedMs: number): number {
  const expected = clampExpectedMs(expectedMs);
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed <= expected) {
    return TIMED_KNEE_FRACTION * (elapsed / expected);
  }
  const overrun = (elapsed - expected) / expected;
  return (
    TIMED_KNEE_FRACTION + (TIMED_CEILING_FRACTION - TIMED_KNEE_FRACTION) * (1 - Math.exp(-overrun))
  );
}

/** Remaining time of uncountable work; keeps shrinking past `expectedMs` instead of freezing. */
export function timedRemainingMs(elapsedMs: number, expectedMs: number): number {
  const expected = clampExpectedMs(expectedMs);
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed < expected) {
    return expected - elapsed;
  }
  return 0.5 * expected * Math.exp(-(elapsed - expected) / expected);
}

export interface RateState {
  /** Items per millisecond. */
  rate: number | null;
  samples: number;
  lastDone: number;
  lastAtMs: number | null;
}

export function emptyRateState(): RateState {
  return { rate: null, samples: 0, lastDone: 0, lastAtMs: null };
}

export function seedRate(state: RateState, itemsPerMs: number): RateState {
  if (!(itemsPerMs > 0)) {
    return state;
  }
  return { ...state, rate: state.rate ?? itemsPerMs };
}

export function updateRate(state: RateState, done: number, nowMs: number): RateState {
  if (state.lastAtMs === null) {
    return { ...state, lastDone: done, lastAtMs: nowMs };
  }
  const elapsed = nowMs - state.lastAtMs;
  const delta = done - state.lastDone;
  if (elapsed <= 0 || delta <= 0) {
    return { ...state, lastDone: Math.max(state.lastDone, done) };
  }
  const sample = delta / elapsed;
  const rate =
    state.rate === null ? sample : RATE_EMA_ALPHA * sample + (1 - RATE_EMA_ALPHA) * state.rate;
  return { rate, samples: state.samples + 1, lastDone: done, lastAtMs: nowMs };
}

export function isOverdue(elapsedMs: number, expectedTotalMs: number): boolean {
  return elapsedMs > OVERDUE_FACTOR * clampExpectedMs(expectedTotalMs);
}

/** Next ETA to display, applying hysteresis so the number does not jitter. */
export function nextDisplayedEta(shownMs: number | null, rawMs: number | null): number | null {
  if (rawMs === null) {
    return null;
  }
  if (shownMs === null) {
    return rawMs;
  }
  const diff = Math.abs(rawMs - shownMs);
  if (diff > ETA_ABSOLUTE_HYSTERESIS_MS || diff > ETA_RELATIVE_HYSTERESIS * shownMs) {
    return rawMs;
  }
  return shownMs;
}

/** Short user-facing ETA text, e.g. "about 25 s left". */
export function formatEta(etaMs: number): string {
  if (etaMs < 5_000) {
    return "a few seconds left";
  }
  if (etaMs < 60_000) {
    return `about ${Math.max(5, Math.round(etaMs / 5_000) * 5)} s left`;
  }
  const halfMinutes = Math.round(etaMs / 30_000) / 2;
  return `about ${halfMinutes} min left`;
}

/** Screen-reader variant of {@link formatEta}. */
export function formatEtaSpoken(etaMs: number): string {
  return formatEta(etaMs).replace(" s left", " seconds left").replace(" min left", " minutes left");
}
