import type { SessionOpsMitigation } from "../map/annotations";

/**
 * Durable one-shot flags for forced full-page reloads (soft_reload / hotfix).
 * Same sessionStorage `"1"` pattern as chunkLoadRecovery.
 */

const SOFT_RELOAD_PREFIX = "jetlag:soft-reload:";
const HOTFIX_RELOAD_PREFIX = "jetlag:hotfix-reload:";

function softReloadKey(mitigationId: string): string {
  return `${SOFT_RELOAD_PREFIX}${mitigationId}`;
}

function hotfixReloadKey(requiredMinAppVersion: string): string {
  return `${HOTFIX_RELOAD_PREFIX}${requiredMinAppVersion}`;
}

function readSessionFlag(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

/** @returns whether the flag is readable after write (false if storage unavailable). */
function writeSessionFlag(key: string): boolean {
  try {
    sessionStorage.setItem(key, "1");
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function hasSoftReloadBeenAcknowledged(mitigationId: string): boolean {
  return readSessionFlag(softReloadKey(mitigationId));
}

export function acknowledgeSoftReload(mitigationId: string): boolean {
  return writeSessionFlag(softReloadKey(mitigationId));
}

export function hasHotfixReloadBeenAcknowledged(
  requiredMinAppVersion: string,
): boolean {
  return readSessionFlag(hotfixReloadKey(requiredMinAppVersion));
}

export function acknowledgeHotfixReload(requiredMinAppVersion: string): boolean {
  return writeSessionFlag(hotfixReloadKey(requiredMinAppVersion));
}

export function shouldHonorSoftReload(options: {
  mitigation: SessionOpsMitigation | null | undefined;
  lastHonoredId: string | null;
}): boolean {
  const { mitigation, lastHonoredId } = options;
  if (!mitigation || mitigation.type !== "soft_reload") {
    return false;
  }
  if (lastHonoredId === mitigation.id) {
    return false;
  }
  if (hasSoftReloadBeenAcknowledged(mitigation.id)) {
    return false;
  }
  return true;
}
