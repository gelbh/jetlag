import posthog from "posthog-js";
import {
  CASTLE_SIEGE_MODE_FLAG_KEY,
  isCastleSiegeFlagEnabled,
} from "@/domain/session/castleSiege/featureFlag";

export function isCastleSiegeModeEnabled(): boolean {
  try {
    const value = posthog.getFeatureFlag(CASTLE_SIEGE_MODE_FLAG_KEY);
    return isCastleSiegeFlagEnabled(value);
  } catch {
    return false;
  }
}
