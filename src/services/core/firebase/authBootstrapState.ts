/**
 * Firebase-SDK-free auth bootstrap flag. Lets boot-path UI (gates, route
 * readiness, Home) read readiness without pulling firebase/* into the App
 * chunk; `firebase.ts` flips the flag once auth bootstrap settles.
 */
import { isFirebaseConfiguredFromEnv } from "@/config/env";

let authBootstrapReady = false;
const authBootstrapListeners = new Set<() => void>();

export function isFirebaseConfigured(): boolean {
  return isFirebaseConfiguredFromEnv();
}

export function markAuthBootstrapReady(): void {
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

export function resetAuthBootstrapStateForTests(): void {
  authBootstrapReady = false;
  authBootstrapListeners.clear();
}
