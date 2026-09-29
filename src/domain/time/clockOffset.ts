export type ClockSample = {
  sentAtMs: number;
  receivedAtMs: number;
  serverMs: number;
};

const MAX_USABLE_RTT_MS = 10_000;

/** NTP-style: offset = server − local midpoint, taken from the lowest-RTT sample. */
export function estimateOffset(samples: readonly ClockSample[]): number | null {
  let best: ClockSample | null = null;
  for (const sample of samples) {
    const rtt = sample.receivedAtMs - sample.sentAtMs;
    if (rtt < 0 || rtt > MAX_USABLE_RTT_MS) continue;
    if (!best || rtt < best.receivedAtMs - best.sentAtMs) best = sample;
  }
  if (!best) return null;
  return Math.round(best.serverMs - (best.sentAtMs + best.receivedAtMs) / 2);
}
