import { ensureAnonymousUser, getFirebaseAuth, isFirebaseConfigured, waitForAuthStateReady } from "./firebase";

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

  const authWork = (async () => {
    await waitForAuthStateReady();

    if (getFirebaseAuth().currentUser) {
      return true;
    }

    await ensureAnonymousUser();
    return getFirebaseAuth().currentUser !== null;
  })();

  const result = await Promise.race([
    authWork,
    sleep(maxWaitMs).then(() => null),
  ]);

  if (result === null) {
    return getFirebaseAuth().currentUser !== null;
  }

  return result;
}
