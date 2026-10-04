import { getClientEnv } from "@/config/env";

/** sessionStorage flag accountAuth sets before an OAuth redirect sign-in leaves the page. */
export const OAUTH_REDIRECT_PENDING_KEY = "jl.oauthRedirectPending";

/** A missing or non-boolean `isAnonymous` counts as no hint: fail toward the sign-in prompt. */
function holdsPermanentUser(storage: Pick<Storage, "getItem">, key: string): boolean {
  try {
    const raw = storage.getItem(key);
    return raw != null && (JSON.parse(raw) as { isAnonymous?: unknown }).isAnonymous === false;
  } catch {
    return false;
  }
}

function hasItem(storage: Pick<Storage, "getItem">, key: string): boolean {
  try {
    return storage.getItem(key) != null;
  } catch {
    return false;
  }
}

function storageOrNull(get: () => Storage): Storage | null {
  try {
    return get();
  } catch {
    return null;
  }
}

/**
 * Synchronous guess, before Firebase Auth restores, that this visit ends signed in to an
 * account: an OAuth redirect sign-in is coming back, or Firebase's local/session persistence
 * entry (`firebase:authUser:<apiKey>:[DEFAULT]`, there because `configureAuthPersistence` picks
 * browserLocal/browserSession) holds a non-anonymous user. Only chooses which placeholder the
 * sign-in UI shows while auth restores; auth state stays the source of truth. Emulator mode
 * keeps Firebase's IndexedDB default, so the hint is false there.
 */
export function expectsPermanentSignIn(
  local: Pick<Storage, "getItem"> | null = storageOrNull(() => window.localStorage),
  session: Pick<Storage, "getItem"> | null = storageOrNull(() => window.sessionStorage),
): boolean {
  if (session && hasItem(session, OAUTH_REDIRECT_PENDING_KEY)) {
    return true;
  }

  const apiKey = getClientEnv().VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    return false;
  }
  const key = `firebase:authUser:${apiKey}:[DEFAULT]`;
  return [local, session].some((storage) => storage != null && holdsPermanentUser(storage, key));
}
