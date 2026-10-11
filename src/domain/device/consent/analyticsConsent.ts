export type AnalyticsConsent = "unset" | "granted" | "denied";

export type WritableAnalyticsConsent = Exclude<AnalyticsConsent, "unset">;

export const ANALYTICS_CONSENT_KEY = "jl.analytics.consent";

const READ_VALUES = new Set<AnalyticsConsent>(["unset", "granted", "denied"]);
const WRITE_VALUES = new Set<WritableAnalyticsConsent>(["granted", "denied"]);

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (raw && READ_VALUES.has(raw as AnalyticsConsent)) {
      return raw as AnalyticsConsent;
    }
  } catch {
    // localStorage unavailable
  }
  return "unset";
}

export function writeAnalyticsConsent(value: WritableAnalyticsConsent): void {
  if (!WRITE_VALUES.has(value)) {
    return;
  }
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // localStorage unavailable
  }
}

/** Sticky per device: set on admin sign-in, never cleared by sign-out (clearing site data resets it). */
export const ANALYTICS_INTERNAL_DEVICE_KEY = "jl.analytics.internal";

export function readInternalDevice(): boolean {
  try {
    return localStorage.getItem(ANALYTICS_INTERNAL_DEVICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markInternalDevice(): void {
  try {
    localStorage.setItem(ANALYTICS_INTERNAL_DEVICE_KEY, "1");
  } catch {
    // localStorage unavailable
  }
}
