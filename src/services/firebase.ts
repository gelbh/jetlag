import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  type Auth,
  type User,
} from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let persistenceUnavailable = false;

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

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = readConfig();
    if (!config) {
      throw new Error("Firebase environment variables are not configured.");
    }

    app = initializeApp(config);
  }

  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
}

function createFirestoreDb(): Firestore {
  const firebaseApp = getFirebaseApp();

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

