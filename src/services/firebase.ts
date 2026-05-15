import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth, type User } from 'firebase/auth'
import {
  getFirestore,
  enableIndexedDbPersistence,
  type Firestore,
} from 'firebase/firestore'

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let persistenceEnabled = false

function readConfig() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  return Object.values(config).every((value) => typeof value === 'string' && value.length > 0)
    ? config
    : null
}

export function isFirebaseConfigured(): boolean {
  return readConfig() !== null
}

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    const config = readConfig()
    if (!config) {
      throw new Error('Firebase environment variables are not configured.')
    }

    app = initializeApp(config)
  }

  return app
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }

  return auth
}

export function getFirestoreDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp())
  }

  return db
}

export async function ensureAnonymousUser(): Promise<User> {
  const firebaseAuth = getFirebaseAuth()

  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser
  }

  const credential = await signInAnonymously(firebaseAuth)
  return credential.user
}

export async function enableOfflinePersistence(): Promise<void> {
  if (persistenceEnabled || !isFirebaseConfigured()) {
    return
  }

  try {
    await enableIndexedDbPersistence(getFirestoreDb())
    persistenceEnabled = true
  } catch {
    persistenceEnabled = true
  }
}
