import { useEffect, useState } from "react";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
} from "../../domain/session/timer";
import { adminSessionTimerState } from "../../domain/admin/sessionPhase";
import type { AdminSessionSummary } from "../../services/admin/adminSessions";

interface AdminSessionTimerProps {
  summary: Pick<
    AdminSessionSummary,
    "timerAccumulatedMs" | "timerRunningSince"
  >;
}

export function AdminSessionTimer({ summary }: AdminSessionTimerProps) {
  const [tick, setTick] = useState(0);
  const timerState = adminSessionTimerState(summary);

  useEffect(() => {
    if (!isTimerRunning(timerState)) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [timerState.runningSince, timerState.accumulatedMs]);

  void tick;

  if (timerState.accumulatedMs <= 0 && timerState.runningSince === null) {
    return <span className="text-sm text-ink-dim">Timer not started</span>;
  }

  return (
    <span className="font-mono text-sm tabular-nums text-ink-secondary">
      {isTimerRunning(timerState) ? "Running · " : "Paused · "}
      {formatElapsedTime(computeElapsedMs(timerState))}
    </span>
  );
}
