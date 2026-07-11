import {
  ensureAnonymousUser,
  getFirebaseAuth,
  isFirebaseConfigured,
  waitForAuthStateReady,
} from "./firebase";

const DEFAULT_GAME_AUTH_WAIT_MS = 10_000;
const PERMANENT_AUTH_READY_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Premium, billing, and proxy paths: wait for persisted sign-in without minting anonymous users.
 */
export async function waitForRestoredFirebaseAuth(): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return true;
  }

  await waitForAuthStateReady();
  return getFirebaseAuth().currentUser !== null;
}

/**
 * Game and map paths: wait for auth restore, then create anonymous only after restore settles.
 */
export async function waitForFirebaseAuth(
  maxWaitMs = DEFAULT_GAME_AUTH_WAIT_MS,
): Promise<boolean> {
  if (!isFirebaseConfigured()) {
    return true;
  }

  const authStateReady = await Promise.race([
    waitForAuthStateReady().then(() => true),
    sleep(maxWaitMs).then(() => false),
  ]);

  if (getFirebaseAuth().currentUser) {
    return true;
  }

  if (!authStateReady) {
    return false;
  }

  await ensureAnonymousUser();
  return getFirebaseAuth().currentUser !== null;
}

export async function waitForPermanentAuthReady(
  maxWaitMs = PERMANENT_AUTH_READY_TIMEOUT_MS,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  await Promise.race([waitForAuthStateReady(), sleep(maxWaitMs)]);
}
