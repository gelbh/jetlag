/** Defaults match `firebase.json` `emulators.*.port` (UI/hub/logging omitted). */
export const FIREBASE_EMULATOR_DEFAULTS = {
  host: "127.0.0.1",
  auth: 9199,
  firestore: 8180,
  storage: 9198,
  functions: 5001,
} as const;

export type FirebaseEmulatorEndpoints = {
  host: string;
  authPort: number;
  firestorePort: number;
  storagePort: number;
  functionsPort: number;
};

function parsePort(raw: string | undefined, fallback: number, envKey: string): number {
  const trimmed = (raw ?? "").trim();
  if (trimmed === "") {
    return fallback;
  }
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(n) || n <= 0 || n >= 65536) {
    throw new Error(
      `${envKey}=${JSON.stringify(raw)} is not an integer port in 1..65535 (refusing silent fallback)`,
    );
  }
  return n;
}

export function firebaseEmulatorEndpoints(
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>,
): FirebaseEmulatorEndpoints {
  const host = (env.VITE_FIREBASE_EMULATOR_HOST ?? "").trim() || FIREBASE_EMULATOR_DEFAULTS.host;
  return {
    host,
    authPort: parsePort(
      env.VITE_FIREBASE_AUTH_EMULATOR_PORT,
      FIREBASE_EMULATOR_DEFAULTS.auth,
      "VITE_FIREBASE_AUTH_EMULATOR_PORT",
    ),
    firestorePort: parsePort(
      env.VITE_FIRESTORE_EMULATOR_PORT,
      FIREBASE_EMULATOR_DEFAULTS.firestore,
      "VITE_FIRESTORE_EMULATOR_PORT",
    ),
    storagePort: parsePort(
      env.VITE_FIREBASE_STORAGE_EMULATOR_PORT,
      FIREBASE_EMULATOR_DEFAULTS.storage,
      "VITE_FIREBASE_STORAGE_EMULATOR_PORT",
    ),
    functionsPort: parsePort(
      env.VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT,
      FIREBASE_EMULATOR_DEFAULTS.functions,
      "VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT",
    ),
  };
}
