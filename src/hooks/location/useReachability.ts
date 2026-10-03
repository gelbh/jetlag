import { useEffect, useRef, useState } from "react";
import { probeServerTime } from "@/services/core/time/serverClock";

const PROBE_TIMEOUT_MS = 5_000;
const UNREACHABLE_FAILURE_THRESHOLD = 2;

const noop = () => {};

/**
 * Polls `/api/time` for reachability. Each probe also feeds the server clock
 * offset (`serverNow()`), so clock sync runs only while this hook is enabled.
 *
 * Re-probes immediately on `online`, on `visibilitychange` → visible, and on
 * `pageshow` (bfcache / iOS WebView resume), since interval timers are frozen
 * while the page is suspended.
 */
export function useReachability(
  enabled: boolean,
  probeIntervalMs = 15_000,
): {
  reachable: boolean | null;
  lastProbeAt: number | null;
  /** Probe now (no-op while disabled or while a probe is in flight). Stable identity. */
  probeNow: () => void;
} {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [lastProbeAt, setLastProbeAt] = useState<number | null>(null);
  const probeRef = useRef<() => void>(noop);
  const [probeNow] = useState(() => () => probeRef.current());

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let consecutiveFailures = 0;
    let inFlight = false;

    const runProbe = async () => {
      if (inFlight) {
        return;
      }
      inFlight = true;
      try {
        const { ok } = await probeServerTime(PROBE_TIMEOUT_MS);
        if (cancelled) {
          return;
        }

        if (ok) {
          consecutiveFailures = 0;
          setReachable(true);
        } else {
          consecutiveFailures += 1;
          if (consecutiveFailures >= UNREACHABLE_FAILURE_THRESHOLD) {
            setReachable(false);
          }
        }

        setLastProbeAt(Date.now());
      } finally {
        inFlight = false;
      }
    };

    // Lie-fi callers must not reset the failure count, or two failed probes
    // would never accumulate into `reachable: false`.
    probeRef.current = () => {
      void runProbe();
    };

    void runProbe();
    const intervalId = window.setInterval(() => {
      void runProbe();
    }, probeIntervalMs);

    const handleResume = () => {
      consecutiveFailures = 0;
      void runProbe();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleResume();
      }
    };

    window.addEventListener("online", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      probeRef.current = noop;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, probeIntervalMs]);

  return { reachable, lastProbeAt, probeNow };
}
