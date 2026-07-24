import posthog from "posthog-js";
import { getClientEnv } from "../../config/env";
import {
  ANALYTICS_EVENTS,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "./analyticsEvents";

export { ANALYTICS_EVENTS, type AnalyticsEventName, type AnalyticsEventProps };

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";

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
    if (value && typeof value === "object" && !Array.isArray(value)) {
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

  const key = getClientEnv().VITE_POSTHOG_KEY?.trim();
  if (!key) {
    return;
  }

  const host =
    getClientEnv().VITE_POSTHOG_HOST?.trim() || DEFAULT_POSTHOG_HOST;

  try {
    posthog.init(key, {
      api_host: host,
      persistence: "memory",
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      person_profiles: "identified_only",
    });
    initialized = true;
  } catch {
    // Soft-fail: analytics must never break app boot.
  }
}

export function trackPageView(path: string): void {
  if (!initialized) {
    return;
  }

  posthog.capture("$pageview", { path });
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
}
