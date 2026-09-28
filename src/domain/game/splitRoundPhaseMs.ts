export function splitRoundPhaseMs(
  durationMs: number,
  hidingPeriodMs: number,
): { hidingPhaseMs: number; seekPhaseMs: number } {
  const duration = Math.max(0, durationMs);
  const period = Math.max(0, hidingPeriodMs);
  const hidingPhaseMs = Math.min(duration, period);
  const seekPhaseMs = Math.max(0, duration - period);
  return { hidingPhaseMs, seekPhaseMs };
}
