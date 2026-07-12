import { useEffect } from "react";
import { useMotionProfile } from "../../hooks/useMotionProfile";

/** Keeps html[data-motion] in sync with reduced motion and low-power decorative mode. */
export function MotionDatasetEffect() {
  const { decorativeAnimate, prefersReducedMotion } = useMotionProfile();

  useEffect(() => {
    if (prefersReducedMotion) {
      document.documentElement.dataset.motion = "reduced";
    } else {
      document.documentElement.dataset.motion = "css";
    }

    document.documentElement.dataset.motionDecorative = decorativeAnimate
      ? "on"
      : "off";
  }, [decorativeAnimate, prefersReducedMotion]);

  return null;
}
