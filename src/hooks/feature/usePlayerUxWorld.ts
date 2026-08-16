import { useSyncExternalStore } from "react";
import posthog from "posthog-js";
import {
  PLAYER_UX_WORLD_FLAG_KEY,
  readPlayerUxWorldFlag,
} from "@/services/core/analytics/playerUxWorldFlag";

export { PLAYER_UX_WORLD_FLAG_KEY };

/**
 * Single gate for the player UX world replace dual path.
 * Reads PostHog `player-ux-world-v2`; defaults to false when unset / loading.
 *
 * Admin-first: enable the flag for an admin cohort in PostHog (no secrets in code).
 */
export function usePlayerUxWorld(): boolean {
  return useSyncExternalStore(
    subscribePlayerUxWorldFlag,
    getPlayerUxWorldFlagSnapshot,
    getPlayerUxWorldFlagServerSnapshot,
  );
}

function getPlayerUxWorldFlagSnapshot(): boolean {
  try {
    return readPlayerUxWorldFlag((key) => posthog.isFeatureEnabled(key));
  } catch {
    return false;
  }
}

function getPlayerUxWorldFlagServerSnapshot(): boolean {
  return false;
}

function subscribePlayerUxWorldFlag(onStoreChange: () => void): () => void {
  try {
    return posthog.onFeatureFlags(() => {
      onStoreChange();
    });
  } catch {
    return () => {};
  }
}
