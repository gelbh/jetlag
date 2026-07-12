import type { AdminSessionPhase } from "../../services/admin/adminSessions";

export function adminSessionPhaseLabel(phase: AdminSessionPhase): string {
  switch (phase) {
    case "waiting":
      return "Waiting";
    case "hiding":
      return "Hiding";
    case "seek":
      return "Seek";
    case "end-game-pending":
      return "End game pending";
    case "end-game-active":
      return "End game";
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

export function adminSessionTimerState(summary: {
  timerAccumulatedMs: number;
  timerRunningSince: string | null;
}) {
  return {
    accumulatedMs: summary.timerAccumulatedMs,
    runningSince: summary.timerRunningSince
      ? Date.parse(summary.timerRunningSince)
      : null,
  };
}
