import { useEffect, useState } from "react";
import { fetchWithTimeout } from "../../services/core/fetchWithTimeout";

const PROBE_TIMEOUT_MS = 5_000;
const PROBE_URL = "/health";
const UNREACHABLE_FAILURE_THRESHOLD = 2;

async function probeReachability(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      PROBE_URL,
      {
        method: "HEAD",
        cache: "no-store",
      },
      PROBE_TIMEOUT_MS,
    );

    return response.ok;
  } catch {
    return false;
  }
}

export function useReachability(
  enabled: boolean,
  probeIntervalMs = 15_000,
): {
  reachable: boolean | null;
  lastProbeAt: number | null;
} {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [lastProbeAt, setLastProbeAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let consecutiveFailures = 0;

    const runProbe = async () => {
      const ok = await probeReachability();
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
    };

    void runProbe();
    const intervalId = window.setInterval(() => {
      void runProbe();
    }, probeIntervalMs);

    const handleOnline = () => {
      consecutiveFailures = 0;
      void runProbe();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", handleOnline);
    };
  }, [enabled, probeIntervalMs]);

  return { reachable, lastProbeAt };
}
