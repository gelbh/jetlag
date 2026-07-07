import { useEffect, useState } from "react";
import {
  computeElapsedMs,
  formatElapsedTime,
  isTimerRunning,
  type TimerState,
} from "../../domain/session/timer";

interface SessionTimerLabelProps {
  timerState: TimerState;
}

export function SessionTimerLabel({ timerState }: SessionTimerLabelProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!isTimerRunning(timerState)) {
      return;
    }

    const bump = () => {
      setTick((value) => value + 1);
    };

    let interval: number | undefined;

    const startInterval = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      bump();
      interval = window.setInterval(bump, 250);
    };

    const stopInterval = () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        startInterval();
      } else {
        stopInterval();
      }
    };

    startInterval();
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopInterval();
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [timerState.runningSince]); // eslint-disable-line react-hooks/exhaustive-deps -- restart interval when run anchor changes

  void tick;

  return formatElapsedTime(computeElapsedMs(timerState));
}
