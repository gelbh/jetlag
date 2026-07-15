import { deleteApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import {
  clientEnvUsesFirebaseEmulator,
  getClientEnv,
  isFirebaseConfiguredFromEnv,
  readFirebaseConfigFromEnv,
} from "../../config/env";
import {
  captureAuthBootstrapFailure,
  captureAuthPersistenceFallback,
  setBootstrapTag,
} from "./sentry";
import { isRecaptchaAlreadyRenderedError } from "./appCheckErrors";

export async function getFirebaseStorage(): Promise<
  import("firebase/storage").FirebaseStorage
> {
  const { getFirebaseStorage: get } = await import("./firebaseStorage");
  return get();
}

export async function getFirebaseFunctions(): Promise<
  import("firebase/functions").Functions
> {
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

export function isFirebaseConfigured(): boolean {
  return isFirebaseConfiguredFromEnv();
}

let authEmulatorConnected = false;
let firestoreEmulatorConnected = false;

function connectAuthEmulatorIfConfigured(firebaseAuth: Auth): void {
  if (!firebaseUsesEmulator() || authEmulatorConnected) {
    return;
  }

  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9199", {
    disableWarnings: true,
  });
  authEmulatorConnected = true;
}

function connectFirestoreEmulatorIfConfigured(firestore: Firestore): void {
  if (!firebaseUsesEmulator() || firestoreEmulatorConnected) {
    return;
  }

  connectFirestoreEmulator(firestore, "127.0.0.1", 8180);
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
    if (!firebaseUsesEmulator()) {
      initializeAppCheckIfConfigured(app);
    }
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
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(siteKey),
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

  getFirebaseApp();
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
let authBootstrapReady = false;
const authBootstrapListeners = new Set<() => void>();

const AUTH_BOOTSTRAP_TIMEOUT_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function markAuthBootstrapReady(): void {
  if (authBootstrapReady) {
    return;
  }

  authBootstrapReady = true;
  for (const listener of authBootstrapListeners) {
    listener();
  }
}

export function isAuthBootstrapReady(): boolean {
  if (!isFirebaseConfigured()) {
    return true;
  }

  return authBootstrapReady;
}

export function subscribeAuthBootstrapReady(listener: () => void): () => void {
  authBootstrapListeners.add(listener);
  return () => {
    authBootstrapListeners.delete(listener);
  };
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
        captureAuthPersistenceFallback(attempt.mode);
      }
      return attempt.mode;
    } catch (error) {
      if (index === attempts.length - 1) {
        captureAuthPersistenceFallback("memory", error);
        throw error;
      }
    }
  }

  return "memory";
}

async function bootstrapAuthState(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  setBootstrapTag("auth_start");

  const persistenceMode = await configureAuthPersistence(firebaseAuth);
  setBootstrapTag(`auth_persistence_${persistenceMode}`);

  const { completeOAuthRedirectIfPending } = await import("./accountAuth");

  await Promise.race([
    Promise.all([
      completeOAuthRedirectIfPending(),
      firebaseAuth.authStateReady(),
    ]),
    sleep(AUTH_BOOTSTRAP_TIMEOUT_MS),
  ]);

  setBootstrapTag("auth_ready");
}

function getAuthBootstrapPromise(): Promise<void> {
  authStateReadyPromise ??= bootstrapAuthState()
    .catch((error) => {
      captureAuthBootstrapFailure(error);
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
  authBootstrapReady = false;
  authBootstrapListeners.clear();
}

