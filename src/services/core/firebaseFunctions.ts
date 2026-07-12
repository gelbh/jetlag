import type { Functions } from "firebase/functions";
import { clientEnvUsesFirebaseEmulator } from "../../config/env";
import { getFirebaseApp } from "./firebase";

let functions: Functions | null = null;
let functionsEmulatorConnected = false;

function firebaseUsesEmulator(): boolean {
  return clientEnvUsesFirebaseEmulator();
}

export async function getFirebaseFunctions(): Promise<Functions> {
  if (!functions) {
    const { connectFunctionsEmulator, getFunctions } = await import(
      "firebase/functions"
    );
    functions = getFunctions(getFirebaseApp());

    if (firebaseUsesEmulator() && !functionsEmulatorConnected) {
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      functionsEmulatorConnected = true;
    }
  }

  return functions;
}

export function resetFirebaseFunctionsForTests(): void {
  functions = null;
  functionsEmulatorConnected = false;
}
