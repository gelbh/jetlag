import { useEffect, useState } from "react";
import { useMapStore } from "../../state/mapStore";

function readPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    readPrefersReducedMotion,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

let motionProfileSubscriberCount = 0;

export function useMotionProfile() {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const prefersReducedMotion = usePrefersReducedMotion();
  const animate = !lowPowerMode && !prefersReducedMotion;

  useEffect(() => {
    motionProfileSubscriberCount += 1;
    document.documentElement.dataset.motion = animate ? "full" : "reduced";
    return () => {
      motionProfileSubscriberCount -= 1;
      if (motionProfileSubscriberCount === 0) {
        delete document.documentElement.dataset.motion;
      }
    };
  }, [animate]);

  return { animate, lowPowerMode, prefersReducedMotion };
}
