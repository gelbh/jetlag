import posthog from "posthog-js";
import { getClientEnv } from "../../config/env";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "../../domain/device/analyticsConsent";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "./analyticsEvents";

export { ANALYTICS_EVENTS, type AnalyticsEventName, type AnalyticsEventProps };

/** First-party Worker reverse proxy (see worker/posthogProxy.ts). */
export const POSTHOG_API_HOST = "/ingest";
export const POSTHOG_UI_HOST = "https://eu.posthog.com";

/** Keys that must never leave the device via product analytics. */
const FORBIDDEN_PROP_KEYS = new Set([
  "sessioncode",
  "code",
  "coordinates",
  "coordinate",
  "lat",
  "lng",
  "latitude",
  "longitude",
  "position",
  "overpass",
  "overpasspayload",
  "elements",
  "hidelocation",
  "hidespot",
  "hidinglocation",
  "preciselocation",
  "gamearea",
  "memberuids",
  "authuid",
  "uid",
  "sessionid",
]);

let initialized = false;
let identifiedUid: string | null = null;

export type AnalyticsIdentityUser = {
  uid: string;
  isAnonymous: boolean;
} | null;

export function shouldEnableAnalytics(env: {
  prod: boolean;
  mode: string;
}): boolean {
  return env.prod && env.mode !== "test";
}

export function scrubAnalyticsProperties(
  props: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!props) {
    return undefined;
  }

  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (FORBIDDEN_PROP_KEYS.has(key.toLowerCase())) {
      continue;
    }
    if (Array.isArray(value)) {
      scrubbed[key] = value.map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return scrubAnalyticsProperties(item as Record<string, unknown>) ?? {};
        }
        return item;
      });
      continue;
    }
    if (value && typeof value === "object") {
      const nested = scrubAnalyticsProperties(value as Record<string, unknown>);
      if (nested && Object.keys(nested).length > 0) {
        scrubbed[key] = nested;
      }
      continue;
    }
    scrubbed[key] = value;
  }
  return scrubbed;
}

function runtimeEnabled(): boolean {
  return shouldEnableAnalytics({
    prod: import.meta.env.PROD,
    mode: import.meta.env.MODE,
  });
}

export function initAnalytics(): void {
  if (!runtimeEnabled() || initialized) {
    return;
  }
  if (readAnalyticsConsent() !== "granted") {
    return;
  }

  const key = getClientEnv().VITE_POSTHOG_KEY?.trim();
  if (!key) {
    return;
  }

  try {
    posthog.init(key, {
      api_host: POSTHOG_API_HOST,
      ui_host: POSTHOG_UI_HOST,
      persistence: "localStorage",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      capture_performance: true,
      disable_session_recording: true,
      disable_external_dependency_loading: false,
      disable_surveys: true,
      person_profiles: "identified_only",
    });
    // IP is personal data; PostHog's `ip: false` is a no-op — disable GeoIP enrichment.
    posthog.register({ $geoip_disable: true });
    initialized = true;
  } catch {
    // Soft-fail: analytics must never break app boot.
  }
}

export function grantAnalyticsConsent(): void {
  writeAnalyticsConsent("granted");
  initAnalytics();
  if (typeof window !== "undefined") {
    trackPageView(window.location.pathname + window.location.search);
  }
}

export function denyAnalyticsConsent(): void {
  writeAnalyticsConsent("denied");
  try {
    posthog.opt_out_capturing();
    posthog.reset(true);
  } catch {
    // Soft-fail: consent must still clear locally.
  }
  identifiedUid = null;
  initialized = false;
}

export function syncAnalyticsIdentity(user: AnalyticsIdentityUser): void {
  if (!initialized) {
    return;
  }
  try {
    if (user && !user.isAnonymous) {
      if (identifiedUid !== user.uid) {
        posthog.identify(user.uid);
        identifiedUid = user.uid;
      }
      return;
    }
    if (identifiedUid !== null) {
      posthog.reset();
      identifiedUid = null;
    }
  } catch {
    // Soft-fail: identity must never break app boot.
  }
}

function pageViewProperties(
  pathWithSearch: string,
): Record<string, string | boolean> {
  const pathname = pathWithSearch.split("?", 1)[0] ?? pathWithSearch;
  const props: Record<string, string | boolean> = {
    path: pathname,
    $pathname: pathname,
  };
  if (typeof document !== "undefined" && document.referrer) {
    props.referrer = document.referrer;
    try {
      props.$referring_domain = new URL(document.referrer).hostname;
    } catch {
      // ignore invalid referrer
    }
  }
  const queryIndex = pathWithSearch.indexOf("?");
  if (queryIndex >= 0) {
    const params = new URLSearchParams(pathWithSearch.slice(queryIndex + 1));
    for (const key of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]) {
      const value = params.get(key);
      if (value) props[key] = value;
    }
  }
  return props;
}

export function trackPageView(path: string): void {
  if (!initialized) {
    return;
  }

  posthog.capture("$pageview", pageViewProperties(path));
}

export function track<E extends AnalyticsEventName>(
  event: E,
  props?: AnalyticsEventProps[E],
): void {
  if (!initialized) {
    return;
  }

  const scrubbed = scrubAnalyticsProperties(
    props as Record<string, unknown> | undefined,
  );
  posthog.capture(event, scrubbed);
}

export function resetAnalyticsForTests(options?: {
  initialized?: boolean;
}): void {
  initialized = options?.initialized ?? false;
  identifiedUid = null;
}
