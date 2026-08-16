import { useSyncExternalStore } from "react";
import posthog from "posthog-js";
import {
  PLAYER_UX_WORLD_FLAG_KEY,
  PLAYER_UX_WORLD_STORAGE_KEY,
  readPlayerUxWorldFlag,
  subscribePlayerUxWorldFlagListeners,
} from "@/services/core/analytics/playerUxWorldFlag";

export { PLAYER_UX_WORLD_FLAG_KEY, PLAYER_UX_WORLD_STORAGE_KEY };

/**
 * Single gate for the player UX world replace dual path.
 * Reads PostHog `player-ux-world-v2`; defaults to false when unset / loading.
 * Honors `localStorage jl.playerUxWorld` = `on` | `off` for e2e / local craft.
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
  const unsubTest = subscribePlayerUxWorldFlagListeners(onStoreChange);

  let unsubPosthog: (() => void) | undefined;
  try {
    unsubPosthog = posthog.onFeatureFlags(() => {
      onStoreChange();
    });
  } catch {
    unsubPosthog = undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === PLAYER_UX_WORLD_STORAGE_KEY || event.key === null) {
      onStoreChange();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    unsubTest();
    unsubPosthog?.();
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
