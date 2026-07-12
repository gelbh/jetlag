import { useContext, useEffect, useState } from "react";
import { MotionCapabilityContext } from "../components/motion/MotionCapabilityProvider";
import { useMapStore } from "../state/mapStore";

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

export function useMotionProfile() {
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const prefersReducedMotion = usePrefersReducedMotion();
  const capability = useContext(MotionCapabilityContext);

  const animate = capability
    ? capability.tier !== "static"
    : !lowPowerMode && !prefersReducedMotion;

  return { animate, lowPowerMode, prefersReducedMotion };
}
