import { useEffect, useState } from "react";

const DEFAULT_TICK_MS = 60_000;

export function useFreshnessClock(tickMs = DEFAULT_TICK_MS): number {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, tickMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [tickMs]);

  return nowMs;
}
