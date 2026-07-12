import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { allowsHaptics, type MotionTier } from "../../domain/device/motionCapability";

export async function impactLightForTier(tier: MotionTier): Promise<void> {
  if (!allowsHaptics(tier) || !Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics are optional; ignore unsupported platforms.
  }
}
