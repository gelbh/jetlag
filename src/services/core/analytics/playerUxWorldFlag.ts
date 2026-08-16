/**
 * PostHog feature flag for the player UX world replace program.
 *
 * Key: `player-ux-world-v2`
 * Default: off (false) for everyone until explicitly targeted.
 *
 * Admin-first rollout (configure in PostHog UI — do not hardcode emails/UIDs here):
 * 1. Create boolean flag `player-ux-world-v2` default OFF.
 * 2. Release conditions: match admin cohort / internal allowlist first.
 * 3. Then percentage → 100%; remove flag after Wave 6 soak.
 *
 * Local override (e2e / manual): `localStorage jl.playerUxWorld` = `on` | `off`.
 * Wins over PostHog when set; clear the key to resume PostHog.
 */
export const PLAYER_UX_WORLD_FLAG_KEY = "player-ux-world-v2";

/** localStorage override for e2e + local craft checks. */
export const PLAYER_UX_WORLD_STORAGE_KEY = "jl.playerUxWorld";

/** Test-only override; null = read storage / PostHog / default false. */
let testOverride: boolean | null = null;

const listeners = new Set<() => void>();

export function setPlayerUxWorldFlagForTests(value: boolean | null): void {
  testOverride = value;
  notifyPlayerUxWorldFlagListeners();
}

/** Same-tab localStorage override (e2e helpers / manual craft). Notifies subscribers. */
export function setPlayerUxWorldStorageOverride(
  value: "on" | "off" | null,
): void {
  try {
    if (typeof localStorage === "undefined") {
      return;
    }
    if (value === null) {
      localStorage.removeItem(PLAYER_UX_WORLD_STORAGE_KEY);
    } else {
      localStorage.setItem(PLAYER_UX_WORLD_STORAGE_KEY, value);
    }
  } catch {
    // private mode / blocked storage
  }
  notifyPlayerUxWorldFlagListeners();
}

export function notifyPlayerUxWorldFlagListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribePlayerUxWorldFlagListeners(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readStorageOverride(): boolean | null {
  try {
    if (typeof localStorage === "undefined") {
      return null;
    }
    const raw = localStorage.getItem(PLAYER_UX_WORLD_STORAGE_KEY);
    if (raw === "on") {
      return true;
    }
    if (raw === "off") {
      return false;
    }
  } catch {
    // private mode / blocked storage
  }
  return null;
}

export function readPlayerUxWorldFlag(
  isFeatureEnabled: (key: string) => boolean | undefined,
): boolean {
  if (import.meta.env.DEV && testOverride !== null) {
    return testOverride;
  }
  const storage = readStorageOverride();
  if (storage !== null) {
    return storage;
  }
  return isFeatureEnabled(PLAYER_UX_WORLD_FLAG_KEY) === true;
}
