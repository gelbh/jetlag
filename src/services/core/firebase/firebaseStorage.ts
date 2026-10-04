import type { FirebaseStorage } from "firebase/storage";
import { clientEnvUsesFirebaseEmulator } from "@/config/env";
import { armAppCheckForEnforcedService, getFirebaseApp } from "./firebase";

let storage: FirebaseStorage | null = null;
let storageEmulatorConnected = false;

function connectStorageEmulatorIfConfigured(
  firebaseStorage: FirebaseStorage,
  connectStorageEmulator: (storage: FirebaseStorage, host: string, port: number) => void,
): void {
  if (!clientEnvUsesFirebaseEmulator() || storageEmulatorConnected) {
    return;
  }

  connectStorageEmulator(firebaseStorage, "127.0.0.1", 9198);
  storageEmulatorConnected = true;
}

export async function getFirebaseStorage(): Promise<FirebaseStorage> {
  if (!storage) {
    const { connectStorageEmulator, getStorage } = await import("firebase/storage");
    // Storage is App Check-enforced: arm it before the first upload/download.
    armAppCheckForEnforcedService();
    storage = getStorage(getFirebaseApp());
    connectStorageEmulatorIfConfigured(storage, connectStorageEmulator);
  }

  return storage;
}

export function resetFirebaseStorageForTests(): void {
  storage = null;
  storageEmulatorConnected = false;
}
