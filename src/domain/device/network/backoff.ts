/**
 * AWS "full jitter" backoff: sleep = random(0, min(cap, base * 2^attempt)).
 * Spreads retries from many phones that lost signal at the same moment.
 */
export function fullJitterDelayMs(
  attempt: number,
  baseMs = 500,
  capMs = 8_000,
  random: () => number = Math.random,
): number {
  return Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt));
}
