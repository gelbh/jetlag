import type { LocalStorageSeed } from "./adapters/toLocalStorageSeed";

/** localStorage keys for session / map / annotations seeds. */
export const LOCAL_STORAGE_SEED_KEYS = [
  "jetlag-session",
  "jetlag-map",
  "jetlag-annotations",
] as const;

/** sessionStorage key for timerStore (not localStorage). */
export const SESSION_STORAGE_SEED_KEYS = ["jetlag-timer"] as const;

export type WebStorages = {
  localStorage: Pick<Storage, "setItem" | "removeItem">;
  sessionStorage: Pick<Storage, "setItem" | "removeItem">;
};

/** Write seed blobs into browser storages (DevScenarios / console paste). */
export function applyLocalStorageSeed(seed: LocalStorageSeed, storages: WebStorages): void {
  const { localStorage: local, sessionStorage: session } = storages;
  local.setItem(LOCAL_STORAGE_SEED_KEYS[0], seed.sessionBlob);
  local.setItem(LOCAL_STORAGE_SEED_KEYS[1], seed.mapBlob);
  local.setItem(LOCAL_STORAGE_SEED_KEYS[2], seed.annotationsBlob);
  if (seed.clearTimer) {
    for (const key of SESSION_STORAGE_SEED_KEYS) {
      session.removeItem(key);
    }
  }
}

/** Clear scenario seed keys only (no other storage). */
export function clearScenarioSeedStorages(storages: WebStorages): void {
  const { localStorage: local, sessionStorage: session } = storages;
  for (const key of LOCAL_STORAGE_SEED_KEYS) {
    local.removeItem(key);
  }
  for (const key of SESSION_STORAGE_SEED_KEYS) {
    session.removeItem(key);
  }
}

/** Console / CLI reset recipe lines derived from the shared key lists. */
export function formatClearSeedRecipeLines(): string[] {
  return [
    ...LOCAL_STORAGE_SEED_KEYS.map((key) => `localStorage.removeItem(${JSON.stringify(key)});`),
    ...SESSION_STORAGE_SEED_KEYS.map((key) => `sessionStorage.removeItem(${JSON.stringify(key)});`),
  ];
}
