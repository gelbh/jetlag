import type { Functions } from "firebase/functions";
import { clientEnvUsesFirebaseEmulator } from "@/config/env";
import { firebaseEmulatorEndpoints } from "@/config/firebaseEmulatorEndpoints";
import { getFirebaseApp, getFirebaseAppCheck } from "./firebase";

let functions: Functions | null = null;
let functionsEmulatorConnected = false;
let functionsPromise: Promise<Functions> | null = null;

function firebaseUsesEmulator(): boolean {
  return clientEnvUsesFirebaseEmulator();
}

export async function getFirebaseFunctions(): Promise<Functions> {
  if (functions) {
    return functions;
  }

  if (!functionsPromise) {
    functionsPromise = (async () => {
      const { connectFunctionsEmulator, getFunctions } = await import("firebase/functions");
      const app = getFirebaseApp();
      // Arm App Check before callables (enforceAppCheck) — not on bare getFirebaseApp (LCP).
      getFirebaseAppCheck();
      const instance = getFunctions(app);
      functions = instance;

      if (firebaseUsesEmulator() && !functionsEmulatorConnected) {
        const { host, functionsPort } = firebaseEmulatorEndpoints();
        connectFunctionsEmulator(instance, host, functionsPort);
        functionsEmulatorConnected = true;
      }

      return instance;
    })();
  }

  return functionsPromise;
}

export function resetFirebaseFunctionsForTests(): void {
  functions = null;
  functionsEmulatorConnected = false;
  functionsPromise = null;
}
