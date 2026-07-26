import { useEffect, useState, type ReactNode } from "react";
import { useAuthBootstrapReady } from "../../hooks/useAuthBootstrapReady";
import {
  probeAppCheckAvailability,
  type AppCheckProbeResult,
} from "../../services/core/appCheckProbe";
import { ContentBlockerErrorPage } from "./ContentBlockerErrorPage";

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

  if (!authReady || probe === null) {
    return children;
  }

  if (!probe.ok) {
    return <ContentBlockerErrorPage />;
  }

  return children;
}
