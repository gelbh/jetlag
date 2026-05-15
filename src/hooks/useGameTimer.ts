import { useCallback, useEffect, useState } from "react";
import { formatElapsedTime } from "../domain/timer";

export function useGameTimer() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!running || startedAt === null) {
      return;
    }

    const tick = () => {
      setElapsedMs(Date.now() - startedAt);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(interval);
    };
  }, [running, startedAt]);

  const start = useCallback(() => {
    if (running) {
      return;
    }

    setStartedAt(Date.now() - elapsedMs);
    setRunning(true);
  }, [elapsedMs, running]);

  const pause = useCallback(() => {
    if (!running || startedAt === null) {
      return;
    }

    setElapsedMs(Date.now() - startedAt);
    setRunning(false);
    setStartedAt(null);
  }, [running, startedAt]);

  const reset = useCallback(() => {
    setElapsedMs(0);
    setRunning(false);
    setStartedAt(null);
  }, []);

  return {
    elapsedMs,
    running,
    hasStarted: elapsedMs > 0 || running,
    formattedElapsed: formatElapsedTime(elapsedMs),
    start,
    pause,
    reset,
  };
}
