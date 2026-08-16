import type { SyncStatus } from "@/domain/device/sync/sync";
import {
  computeElapsedMs,
  type TimerState,
} from "@/domain/session/timer/timer";
import { isHidingPeriodActive } from "@/domain/session/hiding/hidingPeriod";
import type { SessionRulesInput } from "@/domain/session/rules";

/** Plain-language phase for Survey field-book status strip (jargon stays secondary). */
export function surveyPhaseLabel(
  timerHasStarted: boolean,
  sessionRules: SessionRulesInput,
  timerState: TimerState,
  moveInProgress: boolean,
): string {
  if (!timerHasStarted) {
    return "—";
  }
  if (moveInProgress) {
    return "Moving";
  }
  const elapsed = computeElapsedMs(timerState);
  return isHidingPeriodActive(sessionRules, elapsed) ? "Hiding" : "Seeking";
}

/** Always-paired sync short label (never color-only under survey chrome). */
export function surveySyncShortLabel(
  status: SyncStatus,
  queuedWrites: number,
): string {
  switch (status) {
    case "synced":
      return "Synced";
    case "saving":
      return "Saving…";
    case "offline":
      return queuedWrites > 0
        ? `Offline · ${queuedWrites} queued`
        : "Offline";
    case "degraded":
      return queuedWrites > 0
        ? `Unstable · ${queuedWrites} queued`
        : "Unstable";
    case "error":
      return "Sync issue";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
