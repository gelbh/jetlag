import { deleteApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
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
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functions: Functions | null = null;
let appCheck: AppCheck | null = null;
let persistenceUnavailable = false;
let emulatorsConnected = false;

function firebaseUsesEmulator(): boolean {
  return import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
}

export function isFirestorePersistenceUnavailable(): boolean {
  return persistenceUnavailable;
}

function readConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  return Object.values(config).every(
    (value) => typeof value === "string" && value.length > 0,
  )
    ? config
    : null;
}

export function isFirebaseConfigured(): boolean {
  return readConfig() !== null;
}

function connectEmulatorsIfConfigured(
  firestore: Firestore,
  firebaseAuth: Auth,
): void {
  if (!firebaseUsesEmulator() || emulatorsConnected) {
    return;
  }

  connectFirestoreEmulator(firestore, "127.0.0.1", 8180);
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9199", {
    disableWarnings: true,
  });
  emulatorsConnected = true;
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

function initializeAppCheckIfConfigured(firebaseApp: FirebaseApp): void {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim();
  if (!siteKey) {
    return;
  }

  if (appCheck) {
    return;
  }

  appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
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
  }

  return auth;
}

function createFirestoreDb(): Firestore {
  const firebaseApp = getFirebaseApp();

  if (firebaseUsesEmulator()) {
    const firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
    });
    connectEmulatorsIfConfigured(firestore, getFirebaseAuth());
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

export async function ensureAnonymousUser(): Promise<User> {
  const firebaseAuth = getFirebaseAuth();

  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser;
  }

  const credential = await signInAnonymously(firebaseAuth);
  return credential.user;
}

export async function resetFirebaseForTests(): Promise<void> {
  for (const existingApp of getApps()) {
    await deleteApp(existingApp);
  }

  app = null;
  auth = null;
  db = null;
  functions = null;
  appCheck = null;
  persistenceUnavailable = false;
  emulatorsConnected = false;
}

