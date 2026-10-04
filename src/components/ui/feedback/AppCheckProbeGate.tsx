import { type ReactNode, useEffect, useState } from "react";
import { useAppCheckArmed } from "@/hooks/app/useAppCheckArmed";
import type { AppCheckProbeResult } from "@/services/core/firebase/appCheckProbe";
import { ContentBlockerErrorPage } from "./ContentBlockerErrorPage";

/**
 * Content-blocker check for App Check / reCAPTCHA. Probes only after a real
 * token consumer armed App Check, so the gate never loads reCAPTCHA itself on
 * public shells or /join before submit. Keep the app mounted while probing;
 * only swap to the blocker page on a hard blocked result.
 */
export function AppCheckProbeGate({ children }: { children: ReactNode }) {
  const appCheckArmed = useAppCheckArmed();
  const [probe, setProbe] = useState<AppCheckProbeResult | null>(null);

  useEffect(() => {
    if (!appCheckArmed) {
      return;
    }

    let cancelled = false;
    // Dynamic: keeps firebase/app-check off the App chunk's static graph.
    void import("@/services/core/firebase/appCheckProbe")
      .then(({ probeAppCheckAvailability }) => probeAppCheckAvailability())
      .then((result) => {
        if (!cancelled) {
          setProbe(result);
        }
      })
      // Probe chunk failed to load: fail open, same as an inconclusive probe.
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [appCheckArmed]);

  if (probe && !probe.ok) {
    return <ContentBlockerErrorPage />;
  }

  return children;
}
