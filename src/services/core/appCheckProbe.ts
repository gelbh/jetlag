import { getToken } from "firebase/app-check";
import { getClientEnv } from "../../config/env";
import {
  getFirebaseAppCheck,
  isFirebaseConfigured,
} from "./firebase";
import { captureAppCheckTokenFailure } from "./sentry";

export const APP_CHECK_PROBE_SKIP_KEY = "jl.appCheckProbe.skip";
export const APP_CHECK_PROBE_TIMEOUT_MS = 15_000;

export type AppCheckProbeResult =
  | { ok: true }
  | { ok: false; reason: "blocked" | "timeout" | "error" };

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

function looksBlocked(message: string): boolean {
  return /blocked|failed to fetch|load failed|recaptcha/i.test(message);
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
      captureAppCheckTokenFailure(new Error("App Check probe timed out"), {
        source: "appCheckProbe",
        reason: "timeout",
      });
      cachedProbe = { ok: true };
      return cachedProbe;
    }
    if (raced === "empty") {
      captureAppCheckTokenFailure(new Error("App Check probe returned empty token"), {
        source: "appCheckProbe",
        reason: "blocked",
      });
      cachedProbe = { ok: false, reason: "blocked" };
      return cachedProbe;
    }
    cachedProbe = { ok: true };
    return cachedProbe;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    captureAppCheckTokenFailure(error, {
      source: "appCheckProbe",
      reason: looksBlocked(message) ? "blocked" : "error",
    });
    if (looksBlocked(message)) {
      cachedProbe = { ok: false, reason: "blocked" };
      return cachedProbe;
    }
    // Transient / unknown errors: allow the app; App Check still enforced server-side.
    cachedProbe = { ok: true };
    return cachedProbe;
  }
}
