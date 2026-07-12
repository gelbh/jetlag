import { useContext } from "react";
import { MotionCapabilityContext } from "../components/motion/motionCapabilityContext";

/** True when Framer is loaded and should drive drag gestures instead of pointer hooks. */
export function useMotionGesturePath(): boolean {
  const capability = useContext(MotionCapabilityContext);
  return capability?.renderer === "framer" && capability.framerReady === true;
}
