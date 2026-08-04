import { getToken } from "firebase/app-check";
import { getClientEnv } from "@/config/env";
import {
  getFirebaseAppCheck,
  isFirebaseConfigured,
} from "./firebase";
import { captureAppCheckTokenFailure } from "../analytics/sentry";
import {
  classifyAppCheckProbeFailure,
  type AppCheckProbeFailureClass,
} from "../network/clientNoiseErrors";

export const APP_CHECK_PROBE_SKIP_KEY = "jl.appCheckProbe.skip";
export const APP_CHECK_PROBE_TIMEOUT_MS = 15_000;

export type AppCheckProbeResult =
  | { ok: true }
  | { ok: false; reason: "blocked" };

let cachedProbe: AppCheckProbeResult | null = null;
let inFlight: Promise<AppCheckProbeResult> | null = null;

function sleep(ms: number): Promise<"timeout"> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve("timeout"), ms);
  });
}

export function shouldSkipAppCheckProbe(): boolean {
  if (typeof window !== "undefined" && window.__JETLAG_E2E__) {
    return true;
  }

  try {
    return window.sessionStorage.getItem(APP_CHECK_PROBE_SKIP_KEY) === "1";
  } catch {
    return false;
  }
}

export function resetAppCheckProbeForTests(): void {
  cachedProbe = null;
  inFlight = null;
}

/**
 * Once per session: confirm App Check / reCAPTCHA can mint a token.
 * Content blockers that strip Google scripts typically fail here.
 */
export async function probeAppCheckAvailability(): Promise<AppCheckProbeResult> {
  if (cachedProbe) {
    return cachedProbe;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = runProbe().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

function reportProbeFailure(
  error: unknown,
  classification: AppCheckProbeFailureClass,
): AppCheckProbeResult {
  captureAppCheckTokenFailure(error, {
    source: "appCheckProbe",
    reason: classification.reason,
    soft: classification.soft,
  });
  cachedProbe = classification.allowApp
    ? { ok: true }
    : { ok: false, reason: "blocked" };
  return cachedProbe;
}

async function runProbe(): Promise<AppCheckProbeResult> {
  if (shouldSkipAppCheckProbe() || !isFirebaseConfigured()) {
    cachedProbe = { ok: true };
    return cachedProbe;
  }

  const siteKey = getClientEnv().VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (!siteKey) {
    cachedProbe = { ok: true };
    return cachedProbe;
  }

  const appCheck = getFirebaseAppCheck();
  if (!appCheck) {
    cachedProbe = { ok: true };
    return cachedProbe;
  }

  try {
    const raced = await Promise.race([
      getToken(appCheck, false).then((token) =>
        token.token ? ("ok" as const) : ("empty" as const),
      ),
      sleep(APP_CHECK_PROBE_TIMEOUT_MS),
    ]);

    if (raced === "timeout") {
      // Soft-fail: slow networks shouldn't hard-block the app as a "blocker".
      return reportProbeFailure(
        new Error("App Check probe timed out"),
        classifyAppCheckProbeFailure("timeout"),
      );
    }
    if (raced === "empty") {
      return reportProbeFailure(
        new Error("App Check probe returned empty token"),
        classifyAppCheckProbeFailure("empty"),
      );
    }
    cachedProbe = { ok: true };
    return cachedProbe;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return reportProbeFailure(error, classifyAppCheckProbeFailure({ message }));
  }
}
