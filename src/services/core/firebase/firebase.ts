import { deleteApp, type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type AppCheck, initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import {
  type Auth,
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  inMemoryPersistence,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signOut,
  type User,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  type Firestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import {
  clientEnvUsesFirebaseEmulator,
  getClientEnv,
  readFirebaseConfigFromEnv,
} from "@/config/env";
import { firebaseEmulatorEndpoints } from "@/config/firebaseEmulatorEndpoints";
import {
  captureAuthBootstrapFailureLazy,
  captureAuthPersistenceFallbackLazy,
  setBootstrapTagLazy,
  syncAnalyticsIdentityLazy,
} from "../analytics/lazyTelemetry";
import { isRecaptchaAlreadyRenderedError } from "./appCheckErrors";
import {
  isFirebaseConfigured,
  markAuthBootstrapReady,
  resetAuthBootstrapStateForTests,
} from "./authBootstrapState";
import { isDefinitiveAuthFailure } from "./authRecovery";

export {
  isAuthBootstrapReady,
  isFirebaseConfigured,
  subscribeAuthBootstrapReady,
} from "./authBootstrapState";

export async function getFirebaseStorage(): Promise<import("firebase/storage").FirebaseStorage> {
  const { getFirebaseStorage: get } = await import("./firebaseStorage");
  return get();
}

export async function getFirebaseFunctions(): Promise<import("firebase/functions").Functions> {
  const { getFirebaseFunctions: get } = await import("./firebaseFunctions");
  return get();
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let appCheck: AppCheck | null = null;
let appCheckInitializing = false;
let persistenceUnavailable = false;

function firebaseUsesEmulator(): boolean {
  return clientEnvUsesFirebaseEmulator();
}

export function isFirestorePersistenceUnavailable(): boolean {
  return persistenceUnavailable;
}

function readConfig() {
  return readFirebaseConfigFromEnv();
}

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function connectAuthEmulatorIfConfigured(firebaseAuth: Auth): void {
  if (!firebaseUsesEmulator() || authEmulatorConnected) {
    return;
  }

  const { host, authPort } = firebaseEmulatorEndpoints();
  connectAuthEmulator(firebaseAuth, `http://${host}:${authPort}`, {
    disableWarnings: true,
  });
  authEmulatorConnected = true;
}

function connectFirestoreEmulatorIfConfigured(firestore: Firestore): void {
  if (!firebaseUsesEmulator() || firestoreEmulatorConnected) {
    return;
  }

  const { host, firestorePort } = firebaseEmulatorEndpoints();
  connectFirestoreEmulator(firestore, host, firestorePort);
  firestoreEmulatorConnected = true;
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = readConfig();
    if (!config) {
      throw new Error("Firebase environment variables are not configured.");
    }

    const existingApps = getApps();
    app = existingApps.length > 0 ? existingApps[0]! : initializeApp(config);
  }

  return app;
}

function enableAppCheckDebugProviderIfDev(): void {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test") {
    return;
  }

  const debugToken = getClientEnv().VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN;
  const globalScope = globalThis as typeof globalThis & {
    FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
  };

  if (debugToken) {
    globalScope.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    return;
  }

  globalScope.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

function initializeAppCheckIfConfigured(firebaseApp: FirebaseApp): void {
  const siteKey = getClientEnv().VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey || siteKey.length === 0) {
    return;
  }

  if (appCheck || appCheckInitializing) {
    return;
  }

  enableAppCheckDebugProviderIfDev();

  appCheckInitializing = true;
  try {
    // Site key is reCAPTCHA Enterprise (GCP key + App Check enterpriseConfig).
    // Classic ReCaptchaV3Provider → exchangeRecaptchaV3Token 403 attestation failed.
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    if (!isRecaptchaAlreadyRenderedError(error)) {
      throw error;
    }
  } finally {
    appCheckInitializing = false;
  }
}

export function getFirebaseAppCheck(): AppCheck | null {
  if (!isFirebaseConfigured()) {
    return null;
  }

  if (firebaseUsesEmulator()) {
    getFirebaseApp();
    return null;
  }

  const firebaseApp = getFirebaseApp();
  initializeAppCheckIfConfigured(firebaseApp);
  return appCheck;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    connectAuthEmulatorIfConfigured(auth);
  }

  return auth;
}

function createFirestoreDb(): Firestore {
  const firebaseApp = getFirebaseApp();

  if (firebaseUsesEmulator()) {
    const firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
    });
    connectFirestoreEmulatorIfConfigured(firestore);
    return firestore;
  }

  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    persistenceUnavailable = true;
    return initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
    });
  }
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = createFirestoreDb();
  }

  return db;
}

let anonymousSignInPromise: Promise<User> | null = null;
let authStateReadyPromise: Promise<void> | null = null;

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function configureAuthPersistence(
  firebaseAuth: Auth,
): Promise<"local" | "session" | "memory"> {
  if (firebaseUsesEmulator()) {
    return "local";
  }

  const attempts = [
    { mode: "local" as const, persistence: browserLocalPersistence },
    { mode: "session" as const, persistence: browserSessionPersistence },
    { mode: "memory" as const, persistence: inMemoryPersistence },
  ];

  for (let index = 0; index < attempts.length; index += 1) {
    const attempt = attempts[index];
    try {
      await setPersistence(firebaseAuth, attempt.persistence);
      if (index > 0 && attempt.mode !== "local") {
        captureAuthPersistenceFallbackLazy(attempt.mode);
      }
      return attempt.mode;
    } catch (error) {
      if (index === attempts.length - 1) {
        captureAuthPersistenceFallbackLazy("memory", error);
        throw error;
      }
    }
  }

  return "memory";
}

async function bootstrapAuthState(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  setBootstrapTagLazy("auth_start");

  const persistenceMode = await configureAuthPersistence(firebaseAuth);
  setBootstrapTagLazy(`auth_persistence_${persistenceMode}`);

  const { completeOAuthRedirectIfPending } = await import("../auth/accountAuth");

  await Promise.race([
    Promise.all([completeOAuthRedirectIfPending(), firebaseAuth.authStateReady()]),
    sleep(AUTH_BOOTSTRAP_TIMEOUT_MS),
  ]);

  setBootstrapTagLazy("auth_ready");
}

let authAnalyticsUnsubscribe: (() => void) | null = null;

function getAuthBootstrapPromise(): Promise<void> {
  authStateReadyPromise ??= bootstrapAuthState()
    .catch((error) => {
      captureAuthBootstrapFailureLazy(error);
    })
    .finally(() => {
      markAuthBootstrapReady();
    });

  return authStateReadyPromise;
}

export function startAuthBootstrap(): void {
  if (!isFirebaseConfigured()) {
    return;
  }

  authAnalyticsUnsubscribe ??= onAuthStateChanged(getFirebaseAuth(), (user) => {
    syncAnalyticsIdentityLazy(user ? { uid: user.uid, isAnonymous: user.isAnonymous } : null);
  });

  void getAuthBootstrapPromise();
}

export async function waitForAuthStateReady(): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  await getAuthBootstrapPromise();
}

export async function ensureAnonymousUser(): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  await waitForAuthStateReady();

  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  if (!anonymousSignInPromise) {
    anonymousSignInPromise = signInAnonymously(firebaseAuth)
      .then((credential) => credential.user)
      .finally(() => {
        anonymousSignInPromise = null;
      });
  }

  return anonymousSignInPromise;
}

/**
 * Ensure a signed-in user, optionally forcing an ID token refresh (join/heal).
 *
 * Never throws for transient refresh failures (network, quota, internal): the
 * cached user is returned and downstream Firestore / callable requests surface
 * (and retry) their own errors. Only definitive auth failures sign out and mint
 * a new anonymous user — that path can still throw if re-sign-in fails.
 */
export async function ensureFreshAnonymousUser(
  options: { forceRefresh?: boolean } = {},
): Promise<User> {
  const forceRefresh = options.forceRefresh ?? true;
  let user = await ensureAnonymousUser();
  try {
    await user.getIdToken(forceRefresh);
    return user;
  } catch (error) {
    if (!isDefinitiveAuthFailure(error)) {
      return user;
    }
    await signOut(getFirebaseAuth());
    user = await ensureAnonymousUser();
    await user.getIdToken(true);
    return user;
  }
}

export async function resetFirebaseForTests(): Promise<void> {
  for (const existingApp of getApps()) {
    await deleteApp(existingApp);
  }

  app = null;
  auth = null;
  db = null;
  appCheck = null;
  appCheckInitializing = false;
  persistenceUnavailable = false;
  authEmulatorConnected = false;
  firestoreEmulatorConnected = false;
  const { resetFirebaseFunctionsForTests } = await import("./firebaseFunctions");
  const { resetFirebaseStorageForTests } = await import("./firebaseStorage");
  resetFirebaseFunctionsForTests();
  resetFirebaseStorageForTests();
  anonymousSignInPromise = null;
  authStateReadyPromise = null;
  resetAuthBootstrapStateForTests();
}
