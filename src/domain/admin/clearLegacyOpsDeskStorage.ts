const LEGACY_KEY = "jetlag.adminOpsDesk.v1";

export function clearLegacyOpsDeskStorage(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key === LEGACY_KEY || key.startsWith(`${LEGACY_KEY}:`))
        window.localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked (private mode, sandboxed iframe): nothing to clean.
  }
}
