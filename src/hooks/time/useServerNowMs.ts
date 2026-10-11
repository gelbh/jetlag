import { useLayoutEffect, useState } from "react";
import { serverNow } from "@/services/core/time/serverClock";

/**
 * Server clock held in state so compiled renders recompute on each tick.
 * `null` freezes the value (no interval). Pauses while the page is hidden.
 */
export function useServerNowMs(tickMs: number | null): number {
  const [nowMs, setNowMs] = useState(() => serverNow());

  useLayoutEffect(() => {
    if (tickMs === null) {
      return;
    }

    const sync = () => setNowMs(serverNow());
    let interval: number | undefined;

    const start = () => {
      if (document.visibilityState !== "visible" || interval !== undefined) {
        return;
      }
      sync();
      interval = window.setInterval(sync, tickMs);
    };

    const stop = () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
        interval = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        start();
      } else {
        stop();
      }
    };

    start();
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tickMs]);

  return nowMs;
}
