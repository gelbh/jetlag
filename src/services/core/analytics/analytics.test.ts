import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  writeAnalyticsConsent,
} from "../../../domain/device/analyticsConsent";
import {
  ANALYTICS_EVENTS,
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  initAnalytics,
  resetAnalyticsForTests,
  scrubAnalyticsProperties,
  shouldEnableAnalytics,
  syncAnalyticsIdentity,
  track,
  trackPageView,
} from "./analytics";
import { resetClientEnvForTests } from "../../../config/env";

const {
  posthogInit,
  posthogCapture,
  posthogRegister,
  posthogReset,
  posthogOptOut,
  posthogOptIn,
  posthogIdentify,
} = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  posthogCapture: vi.fn(),
  posthogRegister: vi.fn(),
  posthogReset: vi.fn(),
  posthogOptOut: vi.fn(),
  posthogOptIn: vi.fn(),
  posthogIdentify: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInit,
    capture: posthogCapture,
    register: posthogRegister,
    reset: posthogReset,
    opt_out_capturing: posthogOptOut,
    opt_in_capturing: posthogOptIn,
    identify: posthogIdentify,
  },
}));

vi.mock("../../../config/env", async () => {
  const actual = await vi.importActual<typeof import("../../../config/env")>(
    "../../../config/env",
  );
  return {
    ...actual,
    getClientEnv: vi.fn(() => ({
      VITE_POSTHOG_KEY: "phc_test_key",
    })),
  };
});

describe("shouldEnableAnalytics", () => {
  it("enables only in production builds", () => {
    expect(shouldEnableAnalytics({ prod: true, mode: "production" })).toBe(
      true,
    );
    expect(shouldEnableAnalytics({ prod: false, mode: "development" })).toBe(
      false,
    );
    expect(shouldEnableAnalytics({ prod: true, mode: "test" })).toBe(false);
    expect(shouldEnableAnalytics({ prod: false, mode: "test" })).toBe(false);
  });
});

describe("scrubAnalyticsProperties", () => {
  it("strips forbidden keys including nested payloads", () => {
    expect(
      scrubAnalyticsProperties({
        tier: "free",
        sessionCode: "ABCD",
        code: "WXYZ",
        coordinates: [1, 2],
        lat: 53.3,
        lng: -6.2,
        overpassPayload: { elements: [] },
        hideLocation: { lat: 1, lng: 2 },
        gameArea: { type: "Polygon" },
        tool: "radar",
      }),
    ).toEqual({ tier: "free", tool: "radar" });
  });

  it("scrubs forbidden keys inside arrays", () => {
    expect(
      scrubAnalyticsProperties({
        metadata: [{ sessionCode: "ABCD", tool: "pin" }],
      }),
    ).toEqual({ metadata: [{ tool: "pin" }] });
  });
});

describe("analytics facade", () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
    localStorage.clear();
    posthogInit.mockReset();
    posthogCapture.mockReset();
    posthogRegister.mockReset();
    posthogReset.mockReset();
    posthogOptOut.mockReset();
    posthogOptIn.mockReset();
    posthogIdentify.mockReset();
  });

  afterEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis, "Capacitor");
    Reflect.deleteProperty(document, "referrer");
  });

  it("does not init PostHog outside production", () => {
    writeAnalyticsConsent("granted");
    initAnalytics();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, {});

    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("does not init PostHog when consent is unset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    initAnalytics();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, {});

    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("does not init PostHog when consent is denied", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("denied");

    initAnalytics();
    trackPageView("/home");

    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("inits PostHog when consent is granted in production", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");

    initAnalytics();

    expect(posthogOptIn).toHaveBeenCalled();
    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogInit.mock.calls[0]?.[1]).toMatchObject({
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      persistence: "localStorage",
      capture_pageleave: true,
      capture_performance: true,
      disable_session_recording: true,
      disable_external_dependency_loading: false,
      disable_surveys: true,
      person_profiles: "identified_only",
    });
    expect(posthogRegister).toHaveBeenCalledWith({ $geoip_disable: true });
  });

  it("uses direct PostHog EU host on Capacitor native", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    (
      globalThis as { Capacitor?: { isNativePlatform: () => boolean } }
    ).Capacitor = { isNativePlatform: () => true };

    initAnalytics();

    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogInit.mock.calls[0]?.[1]).toMatchObject({
      api_host: "https://eu.i.posthog.com",
    });
  });

  it("strips query from pageview path", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    trackPageView("/create?preset=abc");
    expect(posthogCapture).toHaveBeenCalledWith("$pageview", {
      path: "/create",
      $pathname: "/create",
    });
  });

  it("enriches pageviews with referrer and utm params", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();

    Object.defineProperty(document, "referrer", {
      configurable: true,
      get: () => "https://www.google.com/search?q=jetlag",
    });
    trackPageView(
      "/?utm_source=newsletter&utm_medium=email&utm_campaign=launch",
    );

    expect(posthogCapture).toHaveBeenCalledWith("$pageview", {
      path: "/",
      $pathname: "/",
      referrer: "https://www.google.com/search?q=jetlag",
      $referring_domain: "www.google.com",
      utm_source: "newsletter",
      utm_medium: "email",
      utm_campaign: "launch",
    });
  });

  it("grantAnalyticsConsent writes granted, inits, and captures current page", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubGlobal("location", {
      pathname: "/join",
      search: "",
    });

    grantAnalyticsConsent();

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogCapture).toHaveBeenCalledWith("$pageview", {
      path: "/join",
      $pathname: "/join",
    });
  });

  it("denyAnalyticsConsent writes denied without init", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    denyAnalyticsConsent();
    initAnalytics();

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(posthogInit).not.toHaveBeenCalled();
  });

  it("denyAnalyticsConsent opts out, resets, and stops capture", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    denyAnalyticsConsent();
    trackPageView("/home");
    expect(posthogOptOut).toHaveBeenCalledOnce();
    expect(posthogReset).toHaveBeenCalledWith(true);
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("scrubs forbidden props before capture when initialized", () => {
    writeAnalyticsConsent("granted");
    resetAnalyticsForTests({ initialized: true });

    track(
      ANALYTICS_EVENTS.map_tool_used,
      {
        tool: "radar",
        sessionCode: "ABCD",
        coordinates: [1, 2],
      } as never,
    );

    expect(posthogCapture).toHaveBeenCalledWith("map_tool_used", {
      tool: "radar",
    });
  });

  it("deny clears initialized so capture stops", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    expect(posthogInit).toHaveBeenCalledOnce();

    denyAnalyticsConsent();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, {});

    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("applies stashed identity on init after sync before consent", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    syncAnalyticsIdentity({ uid: "user-accept", isAnonymous: false });
    writeAnalyticsConsent("granted");
    initAnalytics();
    expect(posthogIdentify).toHaveBeenCalledOnce();
    expect(posthogIdentify).toHaveBeenCalledWith("user-accept");
  });

  it("deny then grant calls opt_in and init twice", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubGlobal("location", { pathname: "/", search: "" });
    writeAnalyticsConsent("granted");
    initAnalytics();
    denyAnalyticsConsent();
    grantAnalyticsConsent();
    expect(posthogOptIn).toHaveBeenCalledTimes(2);
    expect(posthogInit).toHaveBeenCalledTimes(2);
  });

  it("identifies permanent users once and resets when they sign out", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();

    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false });
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false });
    expect(posthogIdentify).toHaveBeenCalledTimes(1);
    expect(posthogIdentify).toHaveBeenCalledWith("user-1");

    syncAnalyticsIdentity({ uid: "anon-9", isAnonymous: true });
    expect(posthogReset).toHaveBeenCalledWith(true);
  });

  it("resets when sync receives null after identify", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false });
    posthogReset.mockClear();
    syncAnalyticsIdentity(null);
    expect(posthogReset).toHaveBeenCalledWith(true);
    expect(posthogIdentify).toHaveBeenCalledTimes(1);
  });

  it("does not identify anonymous users", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    syncAnalyticsIdentity({ uid: "anon-1", isAnonymous: true });
    expect(posthogIdentify).not.toHaveBeenCalled();
  });

  it("no-ops identity sync when not initialized", () => {
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false });
    expect(posthogIdentify).not.toHaveBeenCalled();
  });
});
