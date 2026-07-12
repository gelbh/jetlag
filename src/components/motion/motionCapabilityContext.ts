import { createContext } from "react";
import {
  rendererFromTier,
  type MotionTier,
} from "../../domain/device/motionCapability";

export interface MotionCapabilityContextValue {
  tier: MotionTier;
  renderer: ReturnType<typeof rendererFromTier>;
  framerReady: boolean;
  allowsViewTransitions: boolean;
}

export const MotionCapabilityContext =
  createContext<MotionCapabilityContextValue | null>(null);
