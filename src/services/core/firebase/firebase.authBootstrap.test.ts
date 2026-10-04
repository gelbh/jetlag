import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => {
  const auth = {
    currentUser: null as { uid: string } | null,
    authStateReady: vi.fn(async () => undefined),
  };
  return {
    auth,
    getAuth: vi.fn(() => auth),
    setPersistence: vi.fn(async () => undefined),
    onAuthStateChanged: vi.fn(
      (_auth: unknown, _callback: (user: { uid: string; isAnonymous: boolean } | null) => void) =>
        () =>
          undefined,
    ),
    signInAnonymously: vi.fn(async () => ({ user: { uid: "anon-1" } })),
  };
});

const completeOAuthRedirectIfPending = vi.hoisted(() => vi.fn(async () => null));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "[DEFAULT]" })),
  getApps: vi.fn(() => []),
  deleteApp: vi.fn(async () => undefined),
}));

vi.mock("firebase/auth", () => ({
  connectAuthEmulator: vi.fn(),
  getAuth: authMocks.getAuth,
  setPersistence: authMocks.setPersistence,
  browserLocalPersistence: {},
  browserSessionPersistence: {},
  inMemoryPersistence: {},
  signInAnonymously: authMocks.signInAnonymously,
  signOut: vi.fn(),
  onAuthStateChanged: authMocks.onAuthStateChanged,
}));

vi.mock("firebase/app-check", () => ({
  initializeAppCheck: vi.fn(),
  ReCaptchaEnterpriseProvider: class {},
}));

vi.mock("firebase/firestore", () => ({
  connectFirestoreEmulator: vi.fn(),
  initializeFirestore: vi.fn(),
  memoryLocalCache: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

const lazyTelemetryMocks = vi.hoisted(() => ({
  captureAuthBootstrapFailureLazy: vi.fn(),
  captureAuthPersistenceFallbackLazy: vi.fn(),
  setBootstrapTagLazy: vi.fn(),
  syncAnalyticsIdentityLazy: vi.fn(),
  syncSentryUserLazy: vi.fn(),
}));

vi.mock("../analytics/lazyTelemetry", () => lazyTelemetryMocks);

vi.mock("../auth/accountAuth", () => ({
  completeOAuthRedirectIfPending,
}));

vi.mock("../../../config/env", () => ({
  clientEnvUsesFirebaseEmulator: vi.fn(() => false),
  getClientEnv: vi.fn(() => ({
    VITE_FIREBASE_APP_CHECK_SITE_KEY: "",
    VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN: "",
  })),
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

describe("auth bootstrap start", () => {
  beforeEach(() => {
    // Fresh module state per test: the analytics subscription is module-level.
    vi.resetModules();
    vi.clearAllMocks();
    authMocks.auth.currentUser = null;
  });

  it("does not start auth until something asks for it", async () => {
    const { isAuthBootstrapReady } = await import("./firebase");

    expect(authMocks.getAuth).not.toHaveBeenCalled();
    expect(isAuthBootstrapReady()).toBe(false);
  });

  it("an early waitForAuthStateReady runs the bootstrap once; idle start is a no-op", async () => {
    const { isAuthBootstrapReady, startAuthBootstrap, waitForAuthStateReady } = await import(
      "./firebase"
    );

    await waitForAuthStateReady();
    expect(isAuthBootstrapReady()).toBe(true);
    expect(authMocks.setPersistence).toHaveBeenCalledTimes(1);
    expect(completeOAuthRedirectIfPending).toHaveBeenCalledTimes(1);

    startAuthBootstrap();
    startAuthBootstrap();
    await waitForAuthStateReady();

    expect(authMocks.setPersistence).toHaveBeenCalledTimes(1);
    expect(completeOAuthRedirectIfPending).toHaveBeenCalledTimes(1);
    expect(authMocks.auth.authStateReady).toHaveBeenCalledTimes(1);
    expect(authMocks.onAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  it("an early ensureAnonymousUser shares the bootstrap with a later start", async () => {
    const { ensureAnonymousUser, startAuthBootstrap } = await import("./firebase");

    const user = await ensureAnonymousUser();
    startAuthBootstrap();

    expect(user).toEqual({ uid: "anon-1" });
    expect(authMocks.setPersistence).toHaveBeenCalledTimes(1);
    expect(authMocks.auth.authStateReady).toHaveBeenCalledTimes(1);
    expect(authMocks.onAuthStateChanged).toHaveBeenCalledTimes(1);
  });

  it("syncs analytics identity and sentry user on auth state changes", async () => {
    const { startAuthBootstrap } = await import("./firebase");

    startAuthBootstrap();

    const authCallback = authMocks.onAuthStateChanged.mock.calls[0]?.[1] as (
      user: { uid: string; isAnonymous: boolean } | null,
    ) => void;

    authCallback({ uid: "user-1", isAnonymous: false });
    authCallback(null);

    expect(lazyTelemetryMocks.syncAnalyticsIdentityLazy).toHaveBeenNthCalledWith(1, {
      uid: "user-1",
      isAnonymous: false,
    });
    expect(lazyTelemetryMocks.syncSentryUserLazy).toHaveBeenNthCalledWith(1, { uid: "user-1" });
    expect(lazyTelemetryMocks.syncAnalyticsIdentityLazy).toHaveBeenNthCalledWith(2, null);
    expect(lazyTelemetryMocks.syncSentryUserLazy).toHaveBeenNthCalledWith(2, null);
  });
});
