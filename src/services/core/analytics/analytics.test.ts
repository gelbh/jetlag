import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClientEnvForTests } from "@/config/env";
import {
  ANALYTICS_CONSENT_KEY,
  ANALYTICS_INTERNAL_DEVICE_KEY,
  writeAnalyticsConsent,
} from "@/domain/device/consent/analyticsConsent";
import {
  ANALYTICS_EVENTS,
  capturePosthogException,
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  initAnalytics,
  initPosthogCore,
  resetAnalyticsForTests,
  scrubAnalyticsProperties,
  shouldEnableAnalytics,
  syncAnalyticsIdentity,
  track,
  trackPageView,
  trackSessionEnded,
  trackSessionLeaveAlreadyLeft,
} from "./analytics";
import { posthogBeforeSend } from "./posthogBeforeSend";

const {
  posthogInit,
  posthogCapture,
  posthogCaptureException,
  posthogRegister,
  posthogReset,
  posthogOptOut,
  posthogOptIn,
  posthogIdentify,
  posthogStopSessionRecording,
  posthogStartSessionRecording,
} = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  posthogCapture: vi.fn(),
  posthogCaptureException: vi.fn(),
  posthogRegister: vi.fn(),
  posthogReset: vi.fn(),
  posthogOptOut: vi.fn(),
  posthogOptIn: vi.fn(),
  posthogIdentify: vi.fn(),
  posthogStopSessionRecording: vi.fn(),
  posthogStartSessionRecording: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInit,
    capture: posthogCapture,
    captureException: posthogCaptureException,
    register: posthogRegister,
    reset: posthogReset,
    opt_out_capturing: posthogOptOut,
    opt_in_capturing: posthogOptIn,
    identify: posthogIdentify,
    stopSessionRecording: posthogStopSessionRecording,
    startSessionRecording: posthogStartSessionRecording,
  },
}));

vi.mock("../../../config/env", async () => {
  const actual = await vi.importActual<typeof import("@/config/env")>("../../../config/env");
  return {
    ...actual,
    getClientEnv: vi.fn(() => ({
      VITE_POSTHOG_KEY: "phc_test_key",
    })),
  };
});

describe("shouldEnableAnalytics", () => {
  it("enables only in production builds", () => {
    expect(shouldEnableAnalytics({ prod: true, mode: "production" })).toBe(true);
    expect(shouldEnableAnalytics({ prod: false, mode: "development" })).toBe(false);
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

describe("web vitals bundle", () => {
  it("bundles the callback flavor posthog requests for capture_performance: true", () => {
    const extensions = (
      window as unknown as {
        __PosthogExtensions__?: {
          postHogWebVitalsCallbacksByFlavor?: Record<string, unknown>;
        };
      }
    ).__PosthogExtensions__;
    expect(
      extensions?.postHogWebVitalsCallbacksByFlavor?.["web-vitals-with-attribution"],
    ).toBeDefined();
  });
});

describe("analytics facade", () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
    localStorage.clear();
    posthogInit.mockReset();
    posthogCapture.mockReset();
    posthogCaptureException.mockReset();
    posthogRegister.mockReset();
    posthogReset.mockReset();
    posthogOptOut.mockReset();
    posthogOptIn.mockReset();
    posthogIdentify.mockReset();
    posthogStopSessionRecording.mockReset();
    posthogStartSessionRecording.mockReset();
  });

  afterEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(document, "referrer");
  });

  it("does not init PostHog outside production", () => {
    writeAnalyticsConsent("granted");
    initPosthogCore();
    initAnalytics();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, { reason: "host_end" });

    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("initPosthogCore inits once when consent is unset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    initPosthogCore();
    initPosthogCore();

    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogInit.mock.calls[0]?.[1]).toMatchObject({
      api_host: "/ph",
      ui_host: "https://eu.posthog.com",
      disable_session_recording: true,
      before_send: posthogBeforeSend,
    });
    expect(posthogRegister).toHaveBeenCalledWith(expect.objectContaining({ $geoip_disable: true }));
  });

  it("registers display_mode browser when not standalone", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: false })),
    );

    initPosthogCore();

    expect(posthogRegister).toHaveBeenCalledOnce();
    expect(posthogRegister).toHaveBeenCalledWith({
      $geoip_disable: true,
      display_mode: "browser",
    });
  });

  it("registers display_mode standalone for installed PWA", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({ matches: query === "(display-mode: standalone)" })),
    );

    initPosthogCore();

    expect(posthogRegister).toHaveBeenCalledWith(
      expect.objectContaining({ display_mode: "standalone" }),
    );
  });

  it("captures pwa_installed once on appinstalled after consent", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();

    window.dispatchEvent(new Event("appinstalled"));
    window.dispatchEvent(new Event("appinstalled"));

    const installs = posthogCapture.mock.calls.filter(
      (call) => call[0] === ANALYTICS_EVENTS.pwa_installed,
    );
    expect(installs).toHaveLength(1);
  });

  it("does not capture pwa_installed without consent", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();

    window.dispatchEvent(new Event("appinstalled"));

    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("registers one appinstalled listener across repeated core init", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    const addListener = vi.spyOn(window, "addEventListener");

    try {
      initPosthogCore();
      initPosthogCore();

      expect(
        addListener.mock.calls.filter(([type]) => String(type) === "appinstalled"),
      ).toHaveLength(1);
    } finally {
      addListener.mockRestore();
    }
  });

  it("initPosthogCore inits once when consent is denied", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("denied");

    initPosthogCore();

    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogInit.mock.calls[0]?.[1]).toMatchObject({
      disable_session_recording: true,
      before_send: posthogBeforeSend,
    });
  });

  it("track no-ops until consent is granted after core init", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    initPosthogCore();
    track(ANALYTICS_EVENTS.session_created, {
      tier: "free",
      gameSize: "medium",
      role: "seeker",
    });
    trackPageView("/home");

    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("initAnalytics does not enable product capture when consent is unset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    initAnalytics();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, { reason: "host_end" });

    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("initAnalytics does not enable product capture when consent is denied", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("denied");

    initAnalytics();
    trackPageView("/home");

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
      api_host: "/ph",
      ui_host: "https://eu.posthog.com",
      persistence: "localStorage",
      capture_pageleave: true,
      capture_performance: true,
      capture_exceptions: {
        capture_unhandled_errors: true,
        capture_unhandled_rejections: true,
        capture_console_errors: false,
      },
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
        captureCanvas: { recordCanvas: false },
      },
    });
    expect(posthogRegister).toHaveBeenCalledWith(expect.objectContaining({ $geoip_disable: true }));
  });

  it("starts session recording when initAnalytics runs with granted consent", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");

    initAnalytics();

    expect(posthogStartSessionRecording).toHaveBeenCalledOnce();
  });

  it("does not start session recording when consent is denied", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("denied");

    initPosthogCore();
    initAnalytics();

    expect(posthogStartSessionRecording).not.toHaveBeenCalled();
  });

  it("does not start session recording when consent is unset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    initPosthogCore();
    initAnalytics();

    expect(posthogStartSessionRecording).not.toHaveBeenCalled();
  });

  it("deny then grant restarts session recording", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    expect(posthogStartSessionRecording).toHaveBeenCalledOnce();

    denyAnalyticsConsent();
    expect(posthogStopSessionRecording).toHaveBeenCalled();

    grantAnalyticsConsent();
    expect(posthogStartSessionRecording).toHaveBeenCalledTimes(2);
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
    trackPageView("/?utm_source=newsletter&utm_medium=email&utm_campaign=launch");

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
    expect(posthogCapture.mock.calls[0]).toEqual([
      "analytics_consent_accepted",
      { surface: "banner" },
    ]);
    expect(posthogCapture.mock.calls[1]).toEqual([
      "$pageview",
      {
        path: "/join",
        $pathname: "/join",
      },
    ]);
  });

  it("denyAnalyticsConsent never captures analytics_consent_accepted", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");

    denyAnalyticsConsent();

    expect(
      posthogCapture.mock.calls.some(
        (call) => call[0] === ANALYTICS_EVENTS.analytics_consent_accepted,
      ),
    ).toBe(false);
  });

  it("deny after core init does not opt out capturing", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    denyAnalyticsConsent();

    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(posthogOptOut).not.toHaveBeenCalled();
    expect(posthogReset).toHaveBeenCalledWith(true);
    expect(posthogStopSessionRecording).toHaveBeenCalled();
  });

  it("re-registers super properties after deny reset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    posthogRegister.mockClear();

    denyAnalyticsConsent();

    expect(posthogRegister).toHaveBeenCalledWith({
      $geoip_disable: true,
      display_mode: expect.any(String),
    });
    expect(posthogRegister.mock.invocationCallOrder[0]).toBeGreaterThan(
      posthogReset.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("re-registers super properties after sign-out reset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false, isInternal: false });
    posthogRegister.mockClear();

    syncAnalyticsIdentity(null);

    expect(posthogReset).toHaveBeenCalledWith(true);
    expect(posthogRegister).toHaveBeenCalledWith({
      $geoip_disable: true,
      display_mode: expect.any(String),
    });
  });

  it("denyAnalyticsConsent resets identity and stops product capture", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    denyAnalyticsConsent();
    trackPageView("/home");
    expect(posthogOptOut).not.toHaveBeenCalled();
    expect(posthogReset).toHaveBeenCalledWith(true);
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("denied");
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("scrubs forbidden props before capture when initialized", () => {
    writeAnalyticsConsent("granted");
    resetAnalyticsForTests({ initialized: true });

    track(ANALYTICS_EVENTS.map_tool_used, {
      tool: "radar",
      sessionCode: "ABCD",
      coordinates: [1, 2],
    } as never);

    expect(posthogCapture).toHaveBeenCalledWith("map_tool_used", {
      tool: "radar",
    });
  });

  it("deny clears product so capture stops while core stays ready", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    expect(posthogInit).toHaveBeenCalledOnce();

    denyAnalyticsConsent();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, { reason: "host_end" });

    expect(posthogCapture).not.toHaveBeenCalled();
    expect(posthogOptOut).not.toHaveBeenCalled();
  });

  it("applies stashed identity on init after sync before consent", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    syncAnalyticsIdentity({ uid: "user-accept", isAnonymous: false, isInternal: false });
    writeAnalyticsConsent("granted");
    initAnalytics();
    expect(posthogIdentify).toHaveBeenCalledOnce();
    expect(posthogIdentify).toHaveBeenCalledWith("user-accept");
  });

  it("deny then grant reuses core init and opts product back in", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    vi.stubGlobal("location", { pathname: "/", search: "" });
    writeAnalyticsConsent("granted");
    initAnalytics();
    denyAnalyticsConsent();
    grantAnalyticsConsent();
    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogOptIn).toHaveBeenCalled();
    expect(posthogOptOut).not.toHaveBeenCalled();
  });

  it("identifies permanent users once and resets when they sign out", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();

    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false, isInternal: false });
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false, isInternal: false });
    expect(posthogIdentify).toHaveBeenCalledTimes(1);
    expect(posthogIdentify).toHaveBeenCalledWith("user-1");

    syncAnalyticsIdentity({ uid: "anon-9", isAnonymous: true, isInternal: false });
    expect(posthogReset).toHaveBeenCalledWith(true);
  });

  it("resets when sync receives null after identify", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    writeAnalyticsConsent("granted");
    initAnalytics();
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false, isInternal: false });
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
    syncAnalyticsIdentity({ uid: "anon-1", isAnonymous: true, isInternal: false });
    expect(posthogIdentify).not.toHaveBeenCalled();
  });

  it("no-ops identity sync when PostHog core is not ready", () => {
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false, isInternal: false });
    expect(posthogIdentify).not.toHaveBeenCalled();
  });

  it("identifies signed-in users after core init without product Accept", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    syncAnalyticsIdentity({ uid: "user-error", isAnonymous: false, isInternal: false });
    expect(posthogIdentify).toHaveBeenCalledOnce();
    expect(posthogIdentify).toHaveBeenCalledWith("user-error");
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  const lastRegistered = () => posthogRegister.mock.calls.at(-1)?.[0] as Record<string, unknown>;
  const registeredAfterReset = () =>
    posthogReset.mock.invocationCallOrder[0] <
    (posthogRegister.mock.invocationCallOrder.at(-1) ?? 0);

  it("tags the device internal when an admin identity syncs", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    posthogRegister.mockClear();
    syncAnalyticsIdentity({ uid: "admin-1", isAnonymous: false, isInternal: true });
    expect(localStorage.getItem(ANALYTICS_INTERNAL_DEVICE_KEY)).toBe("1");
    expect(lastRegistered()).toMatchObject({ $geoip_disable: true, is_internal: true });
  });

  it("re-registers the internal tag after sign-out reset", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    syncAnalyticsIdentity({ uid: "admin-1", isAnonymous: false, isInternal: true });
    posthogRegister.mockClear();
    syncAnalyticsIdentity(null);
    expect(posthogReset).toHaveBeenCalledWith(true);
    expect(lastRegistered()).toMatchObject({ $geoip_disable: true, is_internal: true });
    expect(registeredAfterReset()).toBe(true);
    expect(localStorage.getItem(ANALYTICS_INTERNAL_DEVICE_KEY)).toBe("1");
  });

  it("registers the internal tag at core init only when the device flag is set", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    expect(lastRegistered()).not.toHaveProperty("is_internal");

    resetAnalyticsForTests();
    posthogRegister.mockClear();
    localStorage.setItem(ANALYTICS_INTERNAL_DEVICE_KEY, "1");
    initPosthogCore();
    expect(lastRegistered()).toMatchObject({ is_internal: true });
  });

  it("re-registers the internal tag after consent deny", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    localStorage.setItem(ANALYTICS_INTERNAL_DEVICE_KEY, "1");
    writeAnalyticsConsent("granted");
    initAnalytics();
    posthogRegister.mockClear();
    denyAnalyticsConsent();
    expect(lastRegistered()).toMatchObject({ $geoip_disable: true, is_internal: true });
    expect(registeredAfterReset()).toBe(true);
  });

  it("does not tag non-admin identities", () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("MODE", "production");
    initPosthogCore();
    syncAnalyticsIdentity({ uid: "user-1", isAnonymous: false, isInternal: false });
    expect(localStorage.getItem(ANALYTICS_INTERNAL_DEVICE_KEY)).toBeNull();
    for (const [props] of posthogRegister.mock.calls) {
      expect(props).not.toHaveProperty("is_internal");
    }
  });

  it("capturePosthogException scrubs session codes before the PostHog sink", () => {
    resetAnalyticsForTests({ initialized: true });
    capturePosthogException(new Error("Join ABCD failed"));
    expect(posthogCaptureException).toHaveBeenCalledOnce();
    const passed = posthogCaptureException.mock.calls[0]?.[0] as Error;
    expect(passed.message).toBe("Join **** failed");
  });

  it("capturePosthogException forwards scrubbed additional properties", () => {
    resetAnalyticsForTests({ initialized: true });
    capturePosthogException(new Error("boom"), {
      photo_upload: "storage",
      sessionCode: "ABCD",
    });

    expect(posthogCaptureException).toHaveBeenCalledOnce();
    const [, props] = posthogCaptureException.mock.calls[0] ?? [];
    expect(props).toMatchObject({ photo_upload: "storage" });
    expect(JSON.stringify(props)).not.toMatch(/ABCD/);
  });

  it("capturePosthogException keeps firebase diagnostic codes and scrubs string leaves", () => {
    resetAnalyticsForTests({ initialized: true });
    capturePosthogException(new Error("boom"), {
      code: "storage/unauthorized",
      note: "Join ABCD failed",
      sessionId: "sess-1",
      uid: "user-1",
    });

    expect(posthogCaptureException).toHaveBeenCalledOnce();
    const [, props] = posthogCaptureException.mock.calls[0] ?? [];
    expect(props).toMatchObject({
      firebase_code: "storage/unauthorized",
      note: "Join **** failed",
    });
    expect(props).not.toHaveProperty("code");
    expect(props).not.toHaveProperty("sessionId");
    expect(props).not.toHaveProperty("uid");
    expect(JSON.stringify(props)).not.toMatch(/ABCD/);
  });

  it("trackSessionEnded captures session_ended with reason", () => {
    writeAnalyticsConsent("granted");
    resetAnalyticsForTests({ initialized: true });

    trackSessionEnded("host_end");

    expect(posthogCapture).toHaveBeenCalledWith("session_ended", {
      reason: "host_end",
    });
  });

  it("trackSessionLeaveAlreadyLeft captures session_leave_already_left", () => {
    writeAnalyticsConsent("granted");
    resetAnalyticsForTests({ initialized: true });

    trackSessionLeaveAlreadyLeft();

    expect(posthogCapture).toHaveBeenCalledWith("session_leave_already_left", undefined);
  });

  it("skips pageviews for static assets and prerender paths", () => {
    writeAnalyticsConsent("granted");
    resetAnalyticsForTests({ initialized: true });

    trackPageView("/og-default.png");
    trackPageView("/prerender/home/");
    expect(posthogCapture).not.toHaveBeenCalled();

    trackPageView("/create");
    expect(posthogCapture).toHaveBeenCalledWith("$pageview", {
      path: "/create",
      $pathname: "/create",
    });
  });
});
