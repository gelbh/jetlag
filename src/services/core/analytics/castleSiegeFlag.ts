import posthog from "posthog-js";
import { clientEnvUsesFirebaseEmulator } from "@/config/env";
import {
  CASTLE_SIEGE_MODE_FLAG_KEY,
  isCastleSiegeFlagEnabled,
} from "@/domain/session/castleSiege/featureFlag";

export function isCastleSiegeModeEnabled(): boolean {
  // Emulator stacks skip PostHog gating so dual-client playtest works offline.
  if (clientEnvUsesFirebaseEmulator()) {
    return true;
  }
  try {
    const value = posthog.getFeatureFlag(CASTLE_SIEGE_MODE_FLAG_KEY);
    return isCastleSiegeFlagEnabled(value);
  } catch {
    return false;
  }
}
