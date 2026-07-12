import { useEffect } from "react";
import { useMotionProfile } from "../../hooks/useMotionProfile";

/** Keeps html[data-motion] in sync with low power and prefers-reduced-motion. */
export function MotionDatasetEffect() {
  const { animate, prefersReducedMotion } = useMotionProfile();

  useEffect(() => {
    if (!animate) {
      document.documentElement.dataset.motion = prefersReducedMotion
        ? "reduced"
        : "static";
      return;
    }

    document.documentElement.dataset.motion = "css";
  }, [animate, prefersReducedMotion]);

  return null;
}
