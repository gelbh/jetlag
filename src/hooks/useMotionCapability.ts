import { useContext } from "react";
import { MotionCapabilityContext } from "../components/motion/motionCapabilityContext";

export function useMotionCapability() {
  const ctx = useContext(MotionCapabilityContext);
  if (!ctx) {
    throw new Error("useMotionCapability must be used within MotionCapabilityProvider");
  }
  return ctx;
}
