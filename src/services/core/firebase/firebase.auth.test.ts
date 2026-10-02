import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  signOut: vi.fn(async () => undefined),
  signInAnonymously: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  connectAuthEmulator: vi.fn(),
  getAuth: authMocks.getAuth,
  setPersistence: vi.fn(async () => undefined),
  browserLocalPersistence: {},
  browserSessionPersistence: {},
  inMemoryPersistence: {},
  signInAnonymously: authMocks.signInAnonymously,
  signOut: authMocks.signOut,
  onAuthStateChanged: vi.fn(() => () => undefined),
}));

vi.mock("firebase/app-check", () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: class ReCaptchaEnterpriseProvider {},
}));

vi.mock("firebase/firestore", () => ({
  connectFirestoreEmulator: vi.fn(),
  initializeFirestore: vi.fn(),
  memoryLocalCache: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

vi.mock("@/config/env", () => ({
  clientEnvUsesFirebaseEmulator: vi.fn(() => false),
  getClientEnv: vi.fn(() => ({})),
  isFirebaseConfiguredFromEnv: vi.fn(() => true),
  readFirebaseConfigFromEnv: vi.fn(() => ({
    apiKey: "demo-api-key",
    authDomain: "demo.firebaseapp.com",
    projectId: "demo",
    storageBucket: "demo.appspot.com",
    messagingSenderId: "123",
    appId: "1:123:web:demo",
  })),
}));

vi.mock("../auth/accountAuth", () => ({
  completeOAuthRedirectIfPending: vi.fn(async () => undefined),
}));

describe("ensureFreshAnonymousUser", () => {
  function fakeUser(uid: string, getIdToken: () => Promise<string>) {
    return { uid, isAnonymous: true, getIdToken: vi.fn(getIdToken) };
  }

  function installAuth(currentUser: unknown) {
    const auth = {
      currentUser,
      authStateReady: vi.fn(async () => undefined),
    };
    authMocks.getAuth.mockReturnValue(auth);
    return auth;
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const { resetFirebaseForTests } = await import("./firebase");
    await resetFirebaseForTests();
  });

  it("keeps the cached user when token refresh fails on the network", async () => {
    const user = fakeUser("uid-cached", async () => {
      throw new FirebaseError("auth/network-request-failed", "network-request-failed");
    });
    installAuth(user);
    const { ensureFreshAnonymousUser } = await import("./firebase");

    await expect(ensureFreshAnonymousUser()).resolves.toBe(user);

    expect(user.getIdToken).toHaveBeenCalledWith(true);
    expect(authMocks.signOut).not.toHaveBeenCalled();
    expect(authMocks.signInAnonymously).not.toHaveBeenCalled();
  });

  it("uses the cached token when forceRefresh is false", async () => {
    const user = fakeUser("uid-cached", async () => "token");
    installAuth(user);
    const { ensureFreshAnonymousUser } = await import("./firebase");

    await expect(ensureFreshAnonymousUser({ forceRefresh: false })).resolves.toBe(user);

    expect(user.getIdToken).toHaveBeenCalledWith(false);
  });

  it("signs out and re-signs in on a definitive auth failure", async () => {
    const stale = fakeUser("uid-stale", async () => {
      throw new FirebaseError("auth/user-disabled", "user-disabled");
    });
    const fresh = fakeUser("uid-fresh", async () => "token");
    const auth = installAuth(stale);
    authMocks.signOut.mockImplementation(async () => {
      auth.currentUser = null;
    });
    authMocks.signInAnonymously.mockResolvedValue({ user: fresh });
    const { ensureFreshAnonymousUser } = await import("./firebase");

    await expect(ensureFreshAnonymousUser()).resolves.toBe(fresh);

    expect(authMocks.signOut).toHaveBeenCalledOnce();
    expect(fresh.getIdToken).toHaveBeenCalledWith(true);
  });

  it("throws when re-sign-in fails after a definitive auth failure", async () => {
    const stale = fakeUser("uid-stale", async () => {
      throw new FirebaseError("auth/user-token-expired", "user-token-expired");
    });
    const auth = installAuth(stale);
    authMocks.signOut.mockImplementation(async () => {
      auth.currentUser = null;
    });
    authMocks.signInAnonymously.mockRejectedValue(
      new FirebaseError("auth/network-request-failed", "network-request-failed"),
    );
    const { ensureFreshAnonymousUser } = await import("./firebase");

    await expect(ensureFreshAnonymousUser()).rejects.toMatchObject({
      code: "auth/network-request-failed",
    });
  });
});
