import { ensureAnonymousUser, getFirebaseAuth, isFirebaseConfigured } from "./firebase";

const AUTH_WAIT_POLL_MS = 50;
const DEFAULT_AUTH_WAIT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForFirebaseAuth(
  maxWaitMs = DEFAULT_AUTH_WAIT_MS,
): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return true;
  }

  if (getFirebaseAuth().currentUser) {
    return true;
  }

  const signInPromise = ensureAnonymousUser()
    .then(() => true)
    .catch(() => false);

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const signedIn = await Promise.race([
      signInPromise,
      sleep(Math.min(AUTH_WAIT_POLL_MS, deadline - Date.now())).then(
        () => null,
      ),
    ]);

    if (signedIn === true || getFirebaseAuth().currentUser) {
      return true;
    }
  }

  return getFirebaseAuth().currentUser !== null;
}
