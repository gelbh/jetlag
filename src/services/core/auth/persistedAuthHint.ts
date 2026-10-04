/** sessionStorage flag accountAuth sets before an OAuth redirect sign-in leaves the page. */
export const OAUTH_REDIRECT_PENDING_KEY = "jl.oauthRedirectPending";

type HintStorage = Pick<Storage, "getItem" | "key" | "length">;

const AUTH_USER_PREFIX = "firebase:authUser:";
const DEFAULT_APP_SUFFIX = ":[DEFAULT]";

/** A missing or non-boolean `isAnonymous` counts as no hint: fail toward the sign-in prompt. */
function holdsPermanentUser(storage: HintStorage): boolean {
  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(AUTH_USER_PREFIX) || !key.endsWith(DEFAULT_APP_SUFFIX)) {
        continue;
      }
      try {
        const raw = storage.getItem(key);
        if (raw != null && (JSON.parse(raw) as { isAnonymous?: unknown }).isAnonymous === false) {
          return true;
        }
      } catch {
        // Malformed entry: keep looking.
      }
    }
  } catch {
    // Blocked storage: no hint.
  }
  return false;
}

function hasItem(storage: HintStorage, key: string): boolean {
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
 * browserLocal/browserSession) holds a non-anonymous user. Matched by prefix so the guess does
 * not depend on client env. Only chooses which placeholder the sign-in UI shows while auth
 * restores; auth state stays the source of truth. Emulator mode keeps Firebase's IndexedDB
 * default, so the hint is false there.
 */
export function expectsPermanentSignIn(
  local: HintStorage | null = storageOrNull(() => window.localStorage),
  session: HintStorage | null = storageOrNull(() => window.sessionStorage),
): boolean {
  if (session && hasItem(session, OAUTH_REDIRECT_PENDING_KEY)) {
    return true;
  }
  return [local, session].some((storage) => storage != null && holdsPermanentUser(storage));
}
