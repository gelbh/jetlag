export type ClockSample = {
  sentAtMs: number;
  receivedAtMs: number;
  serverMs: number;
};

const MAX_USABLE_RTT_MS = 10_000;
/** Offsets beyond this are treated as a bad header / corrupt value, not skew. */
export const MAX_ABS_CLOCK_OFFSET_MS = 24 * 60 * 60 * 1000;

function roundTripMs(sample: ClockSample): number {
  return sample.receivedAtMs - sample.sentAtMs;
}

/** Offset implied by one sample: server time − local midpoint. */
export function sampleOffset(sample: ClockSample): number {
  return Math.round(sample.serverMs - (sample.sentAtMs + sample.receivedAtMs) / 2);
}

/** Whether `offsetMs` is plausible skew rather than garbage. */
export function isPlausibleOffset(offsetMs: number): boolean {
  return Number.isFinite(offsetMs) && Math.abs(offsetMs) <= MAX_ABS_CLOCK_OFFSET_MS;
}

/**
 * Whether `sample` disagrees with `currentOffsetMs` by more than its own RTT
 * uncertainty allows — i.e. the device clock jumped and older samples are stale.
 */
export function indicatesClockJump(
  sample: ClockSample,
  currentOffsetMs: number,
  toleranceMs = 1_000,
): boolean {
  const drift = Math.abs(sampleOffset(sample) - currentOffsetMs);
  return drift > roundTripMs(sample) / 2 + toleranceMs;
}

/** NTP-style: offset = server − local midpoint, taken from the lowest-RTT sample. */
export function estimateOffset(samples: readonly ClockSample[]): number | null {
  let best: ClockSample | null = null;
  for (const sample of samples) {
    const rtt = roundTripMs(sample);
    if (rtt < 0 || rtt > MAX_USABLE_RTT_MS) continue;
    if (!isPlausibleOffset(sampleOffset(sample))) continue;
    if (!best || rtt < roundTripMs(best)) best = sample;
  }
  if (!best) return null;
  return sampleOffset(best);
}
