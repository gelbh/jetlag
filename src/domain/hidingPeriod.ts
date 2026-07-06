import type { GameSize } from "./gameSize";
import { hidingPeriodMs } from "./gameSizeRules";

export function hidingPeriodRemainingMs(
  gameSize: GameSize,
  elapsedMs: number,
): number {
  return Math.max(0, hidingPeriodMs(gameSize) - elapsedMs);
}

export function formatHidingPeriodCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return "Hiding period ended";
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} hiding left`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")} hiding left`;
}
