import { getToken } from "firebase/app-check";
import { getClientEnv } from "@/config/env";
import { isDeviceEffectivelyOffline } from "@/services/core/network/deviceOffline";
import { probeServerTime } from "@/services/core/time/serverClock";
import { captureAppCheckTokenFailure } from "../analytics/sentry";
import {
  type AppCheckProbeFailureClass,
  classifyAppCheckProbeFailure,
} from "../network/clientNoiseErrors";
import { getFirebaseAppCheck, isFirebaseConfigured } from "./firebase";

export const APP_CHECK_PROBE_SKIP_KEY = "jl.appCheckProbe.skip";
export const APP_CHECK_PROBE_TIMEOUT_MS = 15_000;
/** Same-origin reachability check before blaming a content blocker. */
export const APP_CHECK_REACHABILITY_TIMEOUT_MS = 2_000;

export type AppCheckProbeResult = { ok: true } | { ok: false; reason: "blocked" };

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
  cachedProbe = classification.allowApp ? { ok: true } : { ok: false, reason: "blocked" };
  return cachedProbe;
}

/**
 * A dead network fails `getToken` with the same "Failed to fetch" a blocker
 * produces. Blockers leave our own origin alone, so an unreachable
 * `/api/time` means the network, not the player's extensions, is at fault.
 */
async function isNetworkUnreachable(): Promise<boolean> {
  if (isDeviceEffectivelyOffline()) {
    return true;
  }
  const { ok } = await probeServerTime(APP_CHECK_REACHABILITY_TIMEOUT_MS);
  return !ok;
}

async function classifyThrownProbeFailure(message: string): Promise<AppCheckProbeFailureClass> {
  const classification = classifyAppCheckProbeFailure({ message });
  if (classification.allowApp || !(await isNetworkUnreachable())) {
    return classification;
  }
  return classifyAppCheckProbeFailure("offline");
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
    return reportProbeFailure(error, await classifyThrownProbeFailure(message));
  }
}
