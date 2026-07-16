import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

function mapCallableError(error: unknown, fallback: string): Error {
  if (error instanceof FirebaseError) {
    const raw = error.message?.trim();
    const message = !raw || raw === "INTERNAL" ? fallback : raw;
    return new Error(message, { cause: error });
  }

  return error instanceof Error ? error : new Error(fallback);
}

export async function claimUsername(
  username: string,
): Promise<{ username: string }> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ username: string }, { username: string }>(
    functions,
    "claimUsername",
  );

  try {
    const result = await callable({ username });
    return result.data;
  } catch (error) {
    throw mapCallableError(error, "Could not claim that username.");
  }
}
