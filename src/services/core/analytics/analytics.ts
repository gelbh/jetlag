import posthog from "posthog-js";
import "posthog-js/dist/web-vitals";
import "posthog-js/dist/posthog-recorder";
import { getClientEnv } from "@/config/env";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/domain/device/consent/analyticsConsent";
import { isEmbedMode } from "@/domain/device/embed/embedMode";
import { shouldEnableAnalytics } from "./analyticsEnabled";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  type AnalyticsEventProps,
  type SessionEndedReason,
} from "./analyticsEvents";
import { posthogBeforeSend } from "./posthogBeforeSend";
import { scrubTelemetryError } from "./telemetryScrub";

export {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  type AnalyticsEventProps,
  type SessionEndedReason,
};

const ASSET_PAGEVIEW_PATH = /\.(png|jpe?g|webp|gif|svg|ico|json|xml|txt)$/i;

/**
 * First-party Worker reverse proxy path.
 * Must stay in sync with `POSTHOG_PROXY_PATH` in `worker/posthogProxy.ts`.
 */
export const POSTHOG_API_HOST = "/ph";
export const POSTHOG_UI_HOST = "https://eu.posthog.com";

function resolvePosthogApiHost(): string {
  return POSTHOG_API_HOST;
}

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

/** PostHog SDK ready for scrubbed `$exception` (consent-independent). */
let coreInitialized = false;
/** Product analytics (track / pageview / identify) enabled after Accept. */
let initialized = false;
let identifiedUid: string | null = null;
/** Last auth identity seen — applied on init so Accept-after-sign-in still identifies. */
let lastSeenIdentity: AnalyticsIdentity | null = null;

export type AnalyticsIdentity = {
  uid: string;
  isAnonymous: boolean;
};

export { shouldEnableAnalytics };

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
  return (
    !isEmbedMode() &&
    shouldEnableAnalytics({
      prod: import.meta.env.PROD,
      mode: import.meta.env.MODE,
    })
  );
}

/**
 * Link signed-in uid for ungated scrubbed `$exception` once core is up.
 * Product capture stays Accept-gated via `initialized` + `before_send`.
 */
function applyIdentity(user: AnalyticsIdentity | null): void {
  if (!coreInitialized) {
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
      posthog.reset(true);
      identifiedUid = null;
    }
  } catch {
    // Soft-fail: identity must never break app boot.
  }
}

/**
 * Always-on PostHog boot for ungated scrubbed exceptions.
 * Product events stay gated via `posthogBeforeSend` + the `initialized` product flag.
 * Do not call `opt_out_capturing` for Deny — that blocks `$exception`.
 */
export function initPosthogCore(): void {
  if (!runtimeEnabled() || coreInitialized) {
    return;
  }

  const key = getClientEnv().VITE_POSTHOG_KEY?.trim();
  if (!key) {
    return;
  }

  try {
    // Clear sticky opt-out from older Deny paths so exceptions can flow.
    posthog.opt_in_capturing();
    posthog.init(key, {
      api_host: resolvePosthogApiHost(),
      ui_host: POSTHOG_UI_HOST,
      persistence: "localStorage",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: true,
      capture_performance: true,
      disable_session_recording: true,
      disable_external_dependency_loading: true,
      disable_surveys: true,
      person_profiles: "identified_only",
      before_send: posthogBeforeSend,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: "*",
        blockSelector: "img, video, audio, picture, source",
        sampleRate: 0.1,
      },
    });
    // IP is personal data; PostHog's `ip: false` is a no-op — disable GeoIP enrichment.
    posthog.register({ $geoip_disable: true });
    coreInitialized = true;
    applyIdentity(lastSeenIdentity);
  } catch {
    // Soft-fail: analytics must never break app boot.
  }
}

/** Enables product analytics when consent is already granted (boot + Accept path). */
export function initAnalytics(): void {
  initPosthogCore();
  if (!coreInitialized || initialized) {
    return;
  }
  if (readAnalyticsConsent() !== "granted") {
    return;
  }

  try {
    // Sticky persistence can retain opt-out across deny → Accept; clear before product enable.
    posthog.opt_in_capturing();
    initialized = true;
    applyIdentity(lastSeenIdentity);
    posthog.startSessionRecording();
  } catch {
    // Soft-fail: analytics must never break app boot.
  }
}

export function grantAnalyticsConsent(): void {
  writeAnalyticsConsent("granted");
  initAnalytics();
  track(ANALYTICS_EVENTS.analytics_consent_accepted, { surface: "banner" });
  if (typeof window !== "undefined") {
    trackPageView(window.location.pathname + window.location.search);
  }
}

export function denyAnalyticsConsent(): void {
  writeAnalyticsConsent("denied");
  try {
    // Keep capturing on so scrubbed `$exception` can still flow (gated by before_send).
    posthog.stopSessionRecording();
    posthog.reset(true);
  } catch {
    // Soft-fail: consent must still clear locally.
  }
  identifiedUid = null;
  initialized = false;
  // Re-link signed-in uid for ungated error reports after product reset.
  applyIdentity(lastSeenIdentity);
}

export function syncAnalyticsIdentity(user: AnalyticsIdentity | null): void {
  lastSeenIdentity = user;
  applyIdentity(user);
}

function pageViewProperties(pathWithSearch: string): Record<string, string | boolean> {
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
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const value = params.get(key);
      if (value) props[key] = value;
    }
  }
  return props;
}

function shouldSkipPageView(path: string): boolean {
  const pathname = path.split("?", 1)[0] ?? path;
  if (pathname.startsWith("/prerender/")) {
    return true;
  }
  return ASSET_PAGEVIEW_PATH.test(pathname);
}

export function trackPageView(path: string): void {
  if (!initialized) {
    return;
  }
  if (shouldSkipPageView(path)) {
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

  const scrubbed = scrubAnalyticsProperties(props as Record<string, unknown> | undefined);
  posthog.capture(event, scrubbed);
}

export function trackSessionEnded(reason: SessionEndedReason): void {
  track(ANALYTICS_EVENTS.session_ended, { reason });
}

/**
 * Soft-fail PostHog sink for the client `captureException` dual-write (P1).
 * No-op until `initPosthogCore`; never throws into callers.
 * Scrubs session-code-like strings before the SDK builds `$exception` properties.
 */
export function capturePosthogException(error: unknown): void {
  if (!coreInitialized) {
    return;
  }
  try {
    posthog.captureException(scrubTelemetryError(error));
  } catch {
    // Soft-fail: exception reporting must never break the app.
  }
}

export function resetAnalyticsForTests(options?: { initialized?: boolean }): void {
  coreInitialized = options?.initialized ?? false;
  initialized = options?.initialized ?? false;
  identifiedUid = null;
  lastSeenIdentity = null;
}
