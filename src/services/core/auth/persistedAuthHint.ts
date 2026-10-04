import { getClientEnv } from "@/config/env";

/**
 * Synchronous guess, before Firebase Auth restores, at whether this browser holds a signed-in
 * (non-anonymous) account. Reads the entry Firebase's local/session persistence writes
 * (`firebase:authUser:<apiKey>:[DEFAULT]`; `firebase.ts` pins local persistence). Only picks
 * the placeholder sign-in UI shows while auth restores; auth state stays the source of truth.
 */
export function hasPersistedPermanentUserHint(): boolean {
  const apiKey = getClientEnv().VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    return false;
  }

  const key = `firebase:authUser:${apiKey}:[DEFAULT]`;
  for (const getStorage of [() => window.localStorage, () => window.sessionStorage]) {
    try {
      const raw = getStorage().getItem(key);
      if (raw && (JSON.parse(raw) as { isAnonymous?: unknown }).isAnonymous === false) {
        return true;
      }
    } catch {
      // Blocked storage or a malformed entry: no hint.
    }
  }
  return false;
}
