import type { FirebaseStorage } from "firebase/storage";
import { clientEnvUsesFirebaseEmulator } from "@/config/env";
import { firebaseEmulatorEndpoints } from "@/config/firebaseEmulatorEndpoints";
import { getFirebaseApp } from "./firebase";

let storage: FirebaseStorage | null = null;
let storageEmulatorConnected = false;

function connectStorageEmulatorIfConfigured(
  firebaseStorage: FirebaseStorage,
  connectStorageEmulator: (storage: FirebaseStorage, host: string, port: number) => void,
): void {
  if (!clientEnvUsesFirebaseEmulator() || storageEmulatorConnected) {
    return;
  }

  const { host, storagePort } = firebaseEmulatorEndpoints();
  connectStorageEmulator(firebaseStorage, host, storagePort);
  storageEmulatorConnected = true;
}

export async function getFirebaseStorage(): Promise<FirebaseStorage> {
  if (!storage) {
    const { connectStorageEmulator, getStorage } = await import("firebase/storage");
    storage = getStorage(getFirebaseApp());
    connectStorageEmulatorIfConfigured(storage, connectStorageEmulator);
  }

  return storage;
}

export function resetFirebaseStorageForTests(): void {
  storage = null;
  storageEmulatorConnected = false;
}
