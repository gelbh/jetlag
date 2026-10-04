import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const initializeAppCheck = vi.hoisted(() => vi.fn(() => ({ name: "app-check" })));

const firebaseAppMocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: "[DEFAULT]" })),
  getApps: vi.fn(() => [] as { name: string }[]),
  deleteApp: vi.fn(async () => undefined),
}));

const envMocks = vi.hoisted(() => ({
  clientEnvUsesFirebaseEmulator: vi.fn(() => false),
  getClientEnv: vi.fn(() => ({
    VITE_FIREBASE_APP_CHECK_SITE_KEY: "test-recaptcha-site-key",
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

vi.mock("firebase/app-check", () => ({
  initializeAppCheck,
  ReCaptchaEnterpriseProvider: class ReCaptchaEnterpriseProvider {
    siteKey: string;
    constructor(siteKey: string) {
      this.siteKey = siteKey;
    }
  },
}));

vi.mock("firebase/app", () => ({
  initializeApp: firebaseAppMocks.initializeApp,
  getApps: firebaseAppMocks.getApps,
  deleteApp: firebaseAppMocks.deleteApp,
}));

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({ name: "functions" })),
  connectFunctionsEmulator: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  connectAuthEmulator: vi.fn(),
  getAuth: vi.fn(),
  setPersistence: vi.fn(),
  browserLocalPersistence: {},
  browserSessionPersistence: {},
  inMemoryPersistence: {},
  signInAnonymously: vi.fn(),
}));

vi.mock("firebase/storage", () => ({
  getStorage: vi.fn(() => ({ name: "storage" })),
  connectStorageEmulator: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  connectFirestoreEmulator: vi.fn(),
  initializeFirestore: vi.fn(() => ({ name: "firestore" })),
  memoryLocalCache: vi.fn(),
  persistentLocalCache: vi.fn(),
  persistentMultipleTabManager: vi.fn(),
}));

vi.mock("../../../config/env", () => ({
  clientEnvUsesFirebaseEmulator: envMocks.clientEnvUsesFirebaseEmulator,
  getClientEnv: envMocks.getClientEnv,
  isFirebaseConfiguredFromEnv: envMocks.isFirebaseConfiguredFromEnv,
  readFirebaseConfigFromEnv: envMocks.readFirebaseConfigFromEnv,
}));

describe("firebase App Check lazy init", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    envMocks.clientEnvUsesFirebaseEmulator.mockReturnValue(false);
    envMocks.isFirebaseConfiguredFromEnv.mockReturnValue(true);
    firebaseAppMocks.getApps.mockReturnValue([]);
  });

  afterEach(async () => {
    const { resetFirebaseForTests } = await import("./firebase");
    await resetFirebaseForTests();
  });

  it("does not initialize App Check from getFirebaseApp", async () => {
    const { getFirebaseApp } = await import("./firebase");

    getFirebaseApp();

    expect(initializeAppCheck).not.toHaveBeenCalled();
  });

  it("does not arm App Check from auth bootstrap", async () => {
    const { getFirebaseAuth } = await import("./firebase");
    const { isAppCheckArmed } = await import("./appCheckArmedState");

    getFirebaseAuth();

    expect(initializeAppCheck).not.toHaveBeenCalled();
    expect(isAppCheckArmed()).toBe(false);
  });

  it("arms App Check before the first Firestore request (console-enforced)", async () => {
    const { getFirestoreDb } = await import("./firebase");
    const { isAppCheckArmed } = await import("./appCheckArmedState");
    const { initializeFirestore } = await import("firebase/firestore");

    getFirestoreDb();
    getFirestoreDb();

    expect(initializeAppCheck).toHaveBeenCalledOnce();
    expect(initializeAppCheck.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(initializeFirestore).mock.invocationCallOrder[0]!,
    );
    expect(isAppCheckArmed()).toBe(true);
  });

  it("arms App Check on first getFirebaseStorage (console-enforced)", async () => {
    const { getFirebaseStorage } = await import("./firebaseStorage");

    await getFirebaseStorage();

    expect(initializeAppCheck).toHaveBeenCalledOnce();
  });

  it("flags App Check armed under the emulator without initializing it", async () => {
    envMocks.clientEnvUsesFirebaseEmulator.mockReturnValue(true);
    const { getFirebaseAppCheck } = await import("./firebase");
    const { isAppCheckArmed } = await import("./appCheckArmedState");

    getFirebaseAppCheck();

    expect(initializeAppCheck).not.toHaveBeenCalled();
    expect(isAppCheckArmed()).toBe(true);
  });

  it("initializes App Check on first getFirebaseAppCheck", async () => {
    const { getFirebaseApp, getFirebaseAppCheck } = await import("./firebase");

    getFirebaseApp();
    expect(initializeAppCheck).not.toHaveBeenCalled();

    const check = getFirebaseAppCheck();
    const repeated = getFirebaseAppCheck();

    expect(initializeAppCheck).toHaveBeenCalledOnce();
    expect(check).toEqual({ name: "app-check" });
    expect(repeated).toBe(check);
  });

  it("skips App Check when using the Firebase emulator", async () => {
    envMocks.clientEnvUsesFirebaseEmulator.mockReturnValue(true);
    const { getFirebaseAppCheck } = await import("./firebase");

    expect(getFirebaseAppCheck()).toBeNull();
    expect(initializeAppCheck).not.toHaveBeenCalled();
  });

  it("initializes App Check on first getFirebaseFunctions", async () => {
    const { getFirebaseFunctions } = await import("./firebaseFunctions");
    const { resetFirebaseFunctionsForTests } = await import("./firebaseFunctions");
    resetFirebaseFunctionsForTests();

    await getFirebaseFunctions();
    await getFirebaseFunctions();

    expect(initializeAppCheck).toHaveBeenCalledOnce();
  });
});
