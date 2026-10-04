/**
 * Firebase-SDK-free "App Check armed" flag. App Check loads reCAPTCHA (third-party
 * cookies), so only real token consumers arm it: Firestore and Storage (console
 * enforced), callables, and the premium proxy. Boot-path gates read this flag
 * instead of arming App Check themselves, which keeps reCAPTCHA off public shells
 * until the player acts. `firebase.ts` flips it on the first `getFirebaseAppCheck`,
 * so it means "a consumer asked for App Check" — also true under the emulator or
 * without a site key, where App Check itself stays off.
 */
let appCheckArmed = false;
const appCheckArmedListeners = new Set<() => void>();

export function markAppCheckArmed(): void {
  if (appCheckArmed) {
    return;
  }

  appCheckArmed = true;
  for (const listener of appCheckArmedListeners) {
    listener();
  }
}

export function isAppCheckArmed(): boolean {
  return appCheckArmed;
}

export function subscribeAppCheckArmed(listener: () => void): () => void {
  appCheckArmedListeners.add(listener);
  return () => {
    appCheckArmedListeners.delete(listener);
  };
}

export function resetAppCheckArmedStateForTests(): void {
  appCheckArmed = false;
  appCheckArmedListeners.clear();
}
