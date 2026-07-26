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
