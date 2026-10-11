import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "@/domain/session/timer/timer";
import { useServerNowMs } from "@/hooks/time/useServerNowMs";

interface SessionTimerLabelProps {
  timerState: TimerState;
}

export function SessionTimerLabel({ timerState }: SessionTimerLabelProps) {
  const nowMs = useServerNowMs(isTimerRunning(timerState) ? 250 : null);
  return formatElapsedTime(computeElapsedMs(timerState, nowMs));
}
