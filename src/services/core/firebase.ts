import { deleteApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
import { getFunctions, type Functions } from "firebase/functions";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;
let storage: FirebaseStorage | null = null;
let appCheck: AppCheck | null = null;
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
let storageEmulatorConnected = false;

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

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = readConfig();
    if (!config) {
      throw new Error("Firebase environment variables are not configured.");
    }

    app = initializeApp(config);
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

  if (appCheck) {
    return;
  }

  enableAppCheckDebugProviderIfDev();

  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

function connectStorageEmulatorIfConfigured(firebaseStorage: FirebaseStorage): void {
  if (!firebaseUsesEmulator() || storageEmulatorConnected) {
    return;
  }

  connectStorageEmulator(firebaseStorage, "127.0.0.1", 9198);
  storageEmulatorConnected = true;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    connectStorageEmulatorIfConfigured(storage);
  }

  return storage;
}

export function getFirebaseFunctions(): Functions {
  if (!functions) {
    functions = getFunctions(getFirebaseApp());
  }

  return functions;
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

async function bootstrapAuthState(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();

  if (!firebaseUsesEmulator()) {
    try {
      await setPersistence(firebaseAuth, browserLocalPersistence);
    } catch {
      // Persistence may already be configured for this auth instance.
    }
  }

  await firebaseAuth.authStateReady();
}

export async function waitForAuthStateReady(): Promise<void> {
  if (!isFirebaseConfigured()) {
    return;
  }

  authStateReadyPromise ??= bootstrapAuthState();
  await authStateReadyPromise;
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
  functions = null;
  storage = null;
  appCheck = null;
  persistenceUnavailable = false;
  authEmulatorConnected = false;
  firestoreEmulatorConnected = false;
  storageEmulatorConnected = false;
  anonymousSignInPromise = null;
  authStateReadyPromise = null;
}

