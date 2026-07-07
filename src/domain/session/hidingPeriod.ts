import type { GameSize } from "./gameSize";
import type { SessionRulesInput } from "./sessionRules";
import { resolveHidingPeriodMs } from "./sessionRules";

export function hidingPeriodRemainingMs(
  sessionOrGameSize: SessionRulesInput | GameSize,
  elapsedMs: number,
): number {
  const periodMs =
    typeof sessionOrGameSize === "string"
      ? resolveHidingPeriodMs({ gameSize: sessionOrGameSize })
      : resolveHidingPeriodMs(sessionOrGameSize);

  return Math.max(0, periodMs - elapsedMs);
}

export function isHidingPeriodActive(
  sessionOrGameSize: SessionRulesInput | GameSize,
  elapsedMs: number,
): boolean {
  return hidingPeriodRemainingMs(sessionOrGameSize, elapsedMs) > 0;
}

/** Seek-phase clock: elapsed time since hiding period ended (display-only offset). */
export function seekPhaseElapsedMs(
  sessionOrGameSize: SessionRulesInput | GameSize,
  elapsedMs: number,
): number {
  const periodMs =
    typeof sessionOrGameSize === "string"
      ? resolveHidingPeriodMs({ gameSize: sessionOrGameSize })
      : resolveHidingPeriodMs(sessionOrGameSize);

  return Math.max(0, elapsedMs - periodMs);
}

export function formatHidingPeriodCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `HIDING ${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `HIDING ${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
