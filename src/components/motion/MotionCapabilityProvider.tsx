import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as Sentry from "@sentry/react";
import {
  downgradeTier,
  rendererFromTier,
  scoreDeviceSignals,
  tierFromScore,
  upgradeTier,
  type DeviceSignals,
  type MotionTier,
} from "../../domain/device/motionCapability";
import { runTransformBenchmark } from "../../domain/device/motionBenchmark";
import { useFrameBudget } from "../../hooks/useFrameBudget";
import { usePrefersReducedMotion } from "../../hooks/useMotionProfile";
import { useMapStore } from "../../state/mapStore";
import { loadMotionModule } from "./lazyMotion";
import {
  MotionCapabilityContext,
  type MotionCapabilityContextValue,
} from "./motionCapabilityContext";

function readNetworkSignals(): Pick<DeviceSignals, "saveData" | "effectiveType"> {
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  return {
    saveData: conn?.saveData ?? false,
    effectiveType: conn?.effectiveType,
  };
}

export function MotionCapabilityProvider({ children }: { children: ReactNode }) {
  const lowPowerMode = useMapStore((s) => s.lowPowerMode);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [tier, setTier] = useState<MotionTier>("css");
  const [framerReady, setFramerReady] = useState(false);
  const [benchmarkDone, setBenchmarkDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const gpuScore = await runTransformBenchmark();
      if (cancelled) return;

      const signals: DeviceSignals = {
        deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency ?? 4,
        ...readNetworkSignals(),
        gpuScore,
        prefersReducedMotion,
        lowPowerMode,
      };

      const initialTier = tierFromScore(scoreDeviceSignals(signals));
      setTier(initialTier);
      setBenchmarkDone(true);

      if (
        initialTier === "framer-enhanced" ||
        initialTier === "framer-standard"
      ) {
        const schedule =
          typeof requestIdleCallback === "function"
            ? requestIdleCallback
            : (cb: () => void) => window.setTimeout(cb, 1);

        schedule(() => {
          loadMotionModule()
            .then(() => {
              if (!cancelled) setFramerReady(true);
            })
            .catch(() => {
              if (!cancelled) setTier("css");
            });
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [prefersReducedMotion, lowPowerMode]);

  const handleUnhealthy = useCallback(() => {
    setTier((current) => {
      const next = downgradeTier(current);
      if (next !== current) {
        Sentry.addBreadcrumb({
          category: "motion",
          message: `tier downgrade ${current} → ${next}`,
          level: "info",
        });
      }
      return next;
    });
  }, []);

  const handleHealthy = useCallback(() => {
    setTier((current) => upgradeTier(current));
  }, []);

  useFrameBudget({
    enabled: benchmarkDone && tier !== "static",
    onUnhealthy: handleUnhealthy,
    onHealthy: handleHealthy,
  });

  useEffect(() => {
    document.documentElement.dataset.motion = tier;
  }, [tier]);

  const value = useMemo<MotionCapabilityContextValue>(
    () => ({
      tier,
      renderer:
        framerReady && rendererFromTier(tier) === "framer"
          ? "framer"
          : rendererFromTier(tier) === "css"
            ? "css"
            : "static",
      framerReady,
      allowsViewTransitions: tier !== "static",
    }),
    [tier, framerReady],
  );

  return (
    <MotionCapabilityContext.Provider value={value}>
      {children}
    </MotionCapabilityContext.Provider>
  );
}
