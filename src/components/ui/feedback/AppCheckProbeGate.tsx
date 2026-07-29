import { useEffect, useState, type ReactNode } from "react";
import { useAuthBootstrapReady } from "../../../hooks/useAuthBootstrapReady";
import {
  probeAppCheckAvailability,
  type AppCheckProbeResult,
} from "../../../services/core/firebase/appCheckProbe";
import { ContentBlockerErrorPage } from "./ContentBlockerErrorPage";

/**
 * Keep the app mounted while probing. Only swap to the blocker page on a hard
 * blocked result — never unmount routes during the in-flight check.
 */
export function AppCheckProbeGate({ children }: { children: ReactNode }) {
  const authReady = useAuthBootstrapReady();
  const [probe, setProbe] = useState<AppCheckProbeResult | null>(null);

  useEffect(() => {
    if (!authReady) {
      return;
    }

    let cancelled = false;
    void probeAppCheckAvailability().then((result) => {
      if (!cancelled) {
        setProbe(result);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady]);

  if (probe && !probe.ok) {
    return <ContentBlockerErrorPage />;
  }

  return children;
}
