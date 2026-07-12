import type { Functions } from "firebase/functions";
import { clientEnvUsesFirebaseEmulator } from "../../config/env";
import { getFirebaseApp } from "./firebase";

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
      const { connectFunctionsEmulator, getFunctions } = await import(
        "firebase/functions"
      );
      const instance = getFunctions(getFirebaseApp());
      functions = instance;

      if (firebaseUsesEmulator() && !functionsEmulatorConnected) {
        connectFunctionsEmulator(instance, "127.0.0.1", 5001);
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
