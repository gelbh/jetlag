import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANALYTICS_EVENTS,
  initAnalytics,
  resetAnalyticsForTests,
  scrubAnalyticsProperties,
  shouldEnableAnalytics,
  track,
  trackPageView,
} from "./analytics";
import { resetClientEnvForTests } from "../../config/env";

const { posthogInit, posthogCapture } = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  posthogCapture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    init: posthogInit,
    capture: posthogCapture,
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
});

describe("analytics facade", () => {
  beforeEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
    posthogInit.mockReset();
    posthogCapture.mockReset();
  });

  afterEach(() => {
    resetAnalyticsForTests();
    resetClientEnvForTests();
  });

  it("does not init PostHog outside production", () => {
    initAnalytics();
    trackPageView("/home");
    track(ANALYTICS_EVENTS.session_ended, {});

    expect(posthogInit).not.toHaveBeenCalled();
    expect(posthogCapture).not.toHaveBeenCalled();
  });

  it("scrubs forbidden props before capture when initialized", () => {
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
});
