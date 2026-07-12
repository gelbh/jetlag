import { useEffect, useRef, useState } from "react";

const SAMPLE_SIZE = 30;
const DOWNGRADE_DEBOUNCE_MS = 1500;
const UPGRADE_DEBOUNCE_MS = 3000;

export interface UseFrameBudgetOptions {
  enabled: boolean;
  targetFps?: number;
  onUnhealthy?: () => void;
  onHealthy?: () => void;
}

export function useFrameBudget({
  enabled,
  targetFps = 45,
  onUnhealthy,
  onHealthy,
}: UseFrameBudgetOptions) {
  const [isHealthy, setIsHealthy] = useState(true);
  const deltasRef = useRef<number[]>([]);
  const lastRef = useRef<number>(0);
  const unhealthySinceRef = useRef<number | null>(null);
  const healthySinceRef = useRef<number | null>(null);
  const onUnhealthyRef = useRef(onUnhealthy);
  const onHealthyRef = useRef(onHealthy);

  useEffect(() => {
    onUnhealthyRef.current = onUnhealthy;
    onHealthyRef.current = onHealthy;
  }, [onUnhealthy, onHealthy]);

  useEffect(() => {
    if (!enabled || typeof requestAnimationFrame !== "function") {
      return;
    }

    let frameId = 0;

    const loop = (now: number) => {
      if (lastRef.current > 0) {
        const delta = now - lastRef.current;
        const deltas = deltasRef.current;
        deltas.push(delta);
        if (deltas.length > SAMPLE_SIZE) {
          deltas.shift();
        }

        if (deltas.length >= SAMPLE_SIZE) {
          const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
          const avgFps = 1000 / avgDelta;
          const healthy = avgFps >= targetFps;

          if (!healthy) {
            healthySinceRef.current = null;
            if (unhealthySinceRef.current === null) {
              unhealthySinceRef.current = now;
            } else if (now - unhealthySinceRef.current >= DOWNGRADE_DEBOUNCE_MS) {
              setIsHealthy(false);
              onUnhealthyRef.current?.();
              unhealthySinceRef.current = null;
            }
          } else {
            unhealthySinceRef.current = null;
            if (healthySinceRef.current === null) {
              healthySinceRef.current = now;
            } else if (now - healthySinceRef.current >= UPGRADE_DEBOUNCE_MS) {
              setIsHealthy(true);
              onHealthyRef.current?.();
              healthySinceRef.current = null;
            }
          }
        }
      }
      lastRef.current = now;
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [enabled, targetFps]);

  return { isHealthy };
}
