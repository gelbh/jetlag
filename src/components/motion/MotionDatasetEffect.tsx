import { useEffect } from "react";
import { useMotionProfile } from "../../hooks/motion/useMotionProfile";
import { bindDelegatedTapFeedback } from "../../services/device/feedbackService";

export function MotionDatasetEffect() {
  const { decorativeAnimate, prefersReducedMotion } = useMotionProfile();

  useEffect(() => {
    if (prefersReducedMotion) {
      document.documentElement.dataset.motion = "reduced";
    } else {
      document.documentElement.dataset.motion = "css";
    }

    document.documentElement.dataset.motionDecorative = decorativeAnimate ? "on" : "off";
  }, [decorativeAnimate, prefersReducedMotion]);

  useEffect(() => {
    if (!decorativeAnimate) {
      return;
    }

    return bindDelegatedTapFeedback(document);
  }, [decorativeAnimate]);

  return null;
}
