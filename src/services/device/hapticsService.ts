import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

export async function impactLight(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Haptics are optional; ignore unsupported platforms.
  }
}
