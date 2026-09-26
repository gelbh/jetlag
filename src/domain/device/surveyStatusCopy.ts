import type { SyncStatus } from "@/domain/device/sync/sync";
import {
  computeElapsedMs,
  type TimerState,
} from "@/domain/session/timer/timer";
import { isHidingPeriodActive } from "@/domain/session/hiding/hidingPeriod";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { selectPrimaryQuestionTimer } from "@/domain/questions";

/** Plain-language phase for the map status strip (jargon stays secondary). */
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

/**
 * Session-level status for the Mantine map island (no player role).
 * Priority follows what is actually blocking attention in-game.
 */
export function mapIslandSessionStatus(input: {
  timerHasStarted: boolean;
  timerSyncing: boolean;
  timerRunning: boolean;
  canStartGame: boolean;
  moveInProgress: boolean;
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  pendingQuestions?: readonly PendingQuestionRecord[];
}): string {
  const {
    timerHasStarted,
    timerSyncing,
    timerRunning,
    canStartGame,
    moveInProgress,
    sessionRules,
    timerState,
    pendingQuestions = [],
  } = input;

  if (!timerHasStarted) {
    if (timerSyncing) return "Syncing";
    if (canStartGame) return "Ready";
    return "Waiting";
  }

  const questionTimer = selectPrimaryQuestionTimer(pendingQuestions, sessionRules);
  if (questionTimer) {
    if (questionTimer.countdownLabel === "WALKING") return "Walking";
    return "Asking";
  }

  if (moveInProgress) return "Moving";
  if (!timerRunning) return "Paused";

  const elapsed = computeElapsedMs(timerState);
  return isHidingPeriodActive(sessionRules, elapsed) ? "Hiding" : "Seeking";
}

/** Narrow island: keep one short word so status never fights the timer/sync. */
export function mapIslandSessionStatusCompact(status: string): string {
  switch (status) {
    case "Syncing":
      return "Sync…";
    case "Waiting":
      return "Wait";
    case "Ready":
      return "Ready";
    case "Hiding":
      return "Hide";
    case "Seeking":
      return "Seek";
    case "Moving":
      return "Move";
    case "Walking":
      return "Walk";
    case "Asking":
      return "Ask";
    case "Paused":
      return "Pause";
    default:
      return status;
  }
}

export function mapIslandStatusIsLive(status: string): boolean {
  return (
    status === "Hiding" ||
    status === "Moving" ||
    status === "Walking" ||
    status === "Asking" ||
    status === "Seeking"
  );
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

/**
 * Compact sync copy for the status-island segment.
 * Synced is beacon-only; other states stay short enough for phones.
 */
export function surveySyncSegmentLabel(
  status: SyncStatus,
  queuedWrites: number,
): string | null {
  switch (status) {
    case "synced":
      return null;
    case "saving":
      return "Saving…";
    case "offline":
      return queuedWrites > 0 ? `Off · ${queuedWrites}` : "Offline";
    case "degraded":
      return queuedWrites > 0 ? `Unstable · ${queuedWrites}` : "Unstable";
    case "error":
      return "Issue";
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
