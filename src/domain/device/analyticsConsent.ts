export type AnalyticsConsent = "unset" | "granted" | "denied";

export const ANALYTICS_CONSENT_KEY = "jl.analytics.consent";

const VALUES = new Set<AnalyticsConsent>(["unset", "granted", "denied"]);

export function readAnalyticsConsent(): AnalyticsConsent {
  try {
    const raw = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    if (raw && VALUES.has(raw as AnalyticsConsent)) {
      return raw as AnalyticsConsent;
    }
  } catch {
    // localStorage unavailable
  }
  return "unset";
}

export function writeAnalyticsConsent(value: AnalyticsConsent): void {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // localStorage unavailable
  }
}
