/**
 * Durable one-shot acknowledgements for forced full-page reloads.
 *
 * Soft-reload mitigations and hotfix grace reloads only used in-memory refs,
 * so a sticky Firestore gate re-fired after every `location.reload()`.
 * sessionStorage mirrors {@link chunkLoadRecovery} chunk/boot flags.
 */

const SOFT_RELOAD_PREFIX = "jetlag:soft-reload:";
const HOTFIX_RELOAD_PREFIX = "jetlag:hotfix-reload:";

function softReloadKey(mitigationId: string): string {
  return `${SOFT_RELOAD_PREFIX}${mitigationId}`;
}

function hotfixReloadKey(requiredMinAppVersion: string): string {
  return `${HOTFIX_RELOAD_PREFIX}${requiredMinAppVersion}`;
}

export function hasSoftReloadBeenAcknowledged(mitigationId: string): boolean {
  try {
    return sessionStorage.getItem(softReloadKey(mitigationId)) === "1";
  } catch {
    return false;
  }
}

export function acknowledgeSoftReload(mitigationId: string): void {
  try {
    sessionStorage.setItem(softReloadKey(mitigationId), "1");
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

export function hasHotfixReloadBeenAcknowledged(
  requiredMinAppVersion: string,
): boolean {
  try {
    return sessionStorage.getItem(hotfixReloadKey(requiredMinAppVersion)) === "1";
  } catch {
    return false;
  }
}

export function acknowledgeHotfixReload(requiredMinAppVersion: string): void {
  try {
    sessionStorage.setItem(hotfixReloadKey(requiredMinAppVersion), "1");
  } catch {
    // sessionStorage may be unavailable in private browsing.
  }
}

export function shouldHonorSoftReload(options: {
  mitigation: { id: string; type: string } | null | undefined;
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
