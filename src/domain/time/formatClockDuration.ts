import { intervalToDuration } from "date-fns";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatClockDurationFromMs(
  elapsedMs: number,
  options: { ceilSeconds?: boolean } = {},
): string {
  const totalSeconds = Math.max(
    0,
    options.ceilSeconds
      ? Math.ceil(elapsedMs / 1000)
      : Math.floor(elapsedMs / 1000),
  );
  const duration = intervalToDuration({ start: 0, end: totalSeconds * 1000 });
  const hours = duration.hours ?? 0;
  const minutes = duration.minutes ?? 0;
  const seconds = duration.seconds ?? 0;

  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatClockDurationFromSeconds(totalSeconds: number): string {
  return formatClockDurationFromMs(Math.max(0, totalSeconds) * 1000);
}

export function formatShortCountdownFromMs(
  elapsedMs: number,
  options: { ceilSeconds?: boolean } = {},
): string {
  const totalSeconds = Math.max(
    0,
    options.ceilSeconds
      ? Math.ceil(elapsedMs / 1000)
      : Math.floor(elapsedMs / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad2(seconds)}`;
}

export function formatPrefixedClockDuration(
  prefix: string,
  elapsedMs: number,
  options: { ceilSeconds?: boolean } = {},
): string {
  const clock = formatClockDurationFromMs(elapsedMs, options);
  return clock.length > 0 ? `${prefix} ${clock}` : "";
}

export function formatRemainingCountdownFromMs(elapsedMs: number): string {
  return `${formatShortCountdownFromMs(elapsedMs, { ceilSeconds: true })} remaining`;
}
