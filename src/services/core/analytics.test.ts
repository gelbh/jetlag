import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  writeAnalyticsConsent,
} from "../../domain/device/analyticsConsent";
import {
  ANALYTICS_EVENTS,
  denyAnalyticsConsent,
  grantAnalyticsConsent,
  initAnalytics,
  resetAnalyticsForTests,
  scrubAnalyticsProperties,
  shouldEnableAnalytics,
  track,
  trackPageView,
} from "./analytics";
import { resetClientEnvForTests } from "../../config/env";

const { posthogInit, posthogCapture, posthogRegister } = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  posthogCapture: vi.fn(),
  posthogRegister: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInit,
    capture: posthogCapture,
    register: posthogRegister,
  },
}));

vi.mock("../../config/env", async () => {
  const actual = await vi.importActual<typeof import("../../config/env")>(
    "../../config/env",
  );
  return {
    ...actual,
    getClientEnv: vi.fn(() => ({
      VITE_POSTHOG_KEY: "phc_test_key",
      VITE_POSTHOG_HOST: "https://eu.i.posthog.com",
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
  });

  afterEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
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

    expect(posthogInit).toHaveBeenCalledOnce();
    expect(posthogInit.mock.calls[0]?.[1]).toMatchObject({
      disable_session_recording: true,
      disable_external_dependency_loading: true,
      disable_surveys: true,
    });
    expect(posthogRegister).toHaveBeenCalledWith({ $geoip_disable: true });
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
});
