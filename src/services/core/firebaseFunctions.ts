import type { Functions } from "firebase/functions";
import { getFirebaseApp } from "./firebase";

let functions: Functions | null = null;

export async function getFirebaseFunctions(): Promise<Functions> {
  if (!functions) {
    const { getFunctions } = await import("firebase/functions");
    functions = getFunctions(getFirebaseApp());
  }

  return functions;
}

export function resetFirebaseFunctionsForTests(): void {
  functions = null;
}
