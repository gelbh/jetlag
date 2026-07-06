import { useEffect, useState } from "react";
import type { SessionRulesInput } from "../../domain/sessionRules";
import {
  formatHidingPeriodCountdown,
  hidingPeriodRemainingMs,
} from "../../domain/hidingPeriod";
import {
  computeElapsedMs,
  isTimerRunning,
  type TimerState,
} from "../../domain/timer";

interface HidingPeriodLabelProps {
  sessionRules: SessionRulesInput;
  timerState: TimerState;
  timerHasStarted: boolean;
}

export function HidingPeriodLabel({
  sessionRules,
  timerState,
  timerHasStarted,
}: HidingPeriodLabelProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!timerHasStarted || !isTimerRunning(timerState)) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restart interval when run anchor changes
  }, [timerHasStarted, timerState.runningSince]);

  void tick;

  if (!timerHasStarted) {
    return null;
  }

  const remaining = hidingPeriodRemainingMs(
    sessionRules,
    computeElapsedMs(timerState),
  );

  if (remaining <= 0) {
    return null;
  }

  return (
    <p className="px-1 text-xs font-medium tabular-nums text-brand-gold">
      {formatHidingPeriodCountdown(remaining)}
    </p>
  );
}
