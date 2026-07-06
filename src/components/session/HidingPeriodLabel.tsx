import { useEffect, useState } from "react";
import type { GameSize } from "../../domain/gameSize";
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
  gameSize: GameSize;
  timerState: TimerState;
  timerHasStarted: boolean;
}

export function HidingPeriodLabel({
  gameSize,
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
  }, [timerHasStarted, timerState.runningSince]);

  void tick;

  if (!timerHasStarted) {
    return null;
  }

  const remaining = hidingPeriodRemainingMs(
    gameSize,
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
