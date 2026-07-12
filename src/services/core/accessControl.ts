import { FirebaseError } from "firebase/app";
import { getToken } from "firebase/app-check";
import { httpsCallable } from "firebase/functions";
import type { User } from "firebase/auth";
import {
  getFirebaseAppCheck,
  getFirebaseAuth,
  getFirebaseFunctions,
  isFirebaseConfigured,
} from "./firebase";
import { captureAppCheckTokenFailure } from "./sentry";

export async function hasAccessClaim(user: User): Promise<boolean> {
  const token = await user.getIdTokenResult();
  return token.claims.access === true;
}

export async function grantAccess(code: string): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<{ code: string }, { granted: boolean }>(
    functions,
    "grantAccess",
  );

  try {
    await callable({ code });
  } catch (error) {
    if (error instanceof FirebaseError) {
      if (error.code === "functions/permission-denied") {
        throw new Error("Invalid access code.", { cause: error });
      }

      throw new Error(error.message, { cause: error });
    }

    throw error;
  }

  await getFirebaseAuth().currentUser?.getIdToken(true);
}

export async function getAccessToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) {
    return null;
  }

  return user.getIdToken();
}

export async function buildPremiumProxyHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  const token = await getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const { getPremiumApiContext } = await import("./premiumApiContext");
  const { sessionId } = getPremiumApiContext();
  if (sessionId) {
    headers["X-Session-Id"] = sessionId;
  }

  const appCheck = getFirebaseAppCheck();
  if (appCheck) {
    try {
      const appCheckToken = await getToken(appCheck, false);
      if (appCheckToken.token) {
        headers["X-Firebase-AppCheck"] = appCheckToken.token;
      }
    } catch (error) {
      captureAppCheckTokenFailure(error, { source: "buildPremiumProxyHeaders" });
    }
  }

  return headers;
}
