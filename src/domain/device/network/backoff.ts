export function fullJitterDelayMs(
  attempt: number,
  baseMs = 500,
  capMs = 8_000,
  random: () => number = Math.random,
): number {
  return Math.floor(random() * Math.min(capMs, baseMs * 2 ** attempt));
}
