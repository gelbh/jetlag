import { describe, expect, it } from "vitest";
import { resolveSentryReleaseDist } from "./vite.sentry-dist";

describe("resolveSentryReleaseDist", () => {
  it("returns VITE_SENTRY_RELEASE_DIST when set", () => {
    expect(
      resolveSentryReleaseDist({
        VITE_SENTRY_RELEASE_DIST: "abc123",
      }),
    ).toBe("abc123");
  });

  it("falls back to SENTRY_RELEASE_DIST", () => {
    expect(
      resolveSentryReleaseDist({
        SENTRY_RELEASE_DIST: "def456",
      }),
    ).toBe("def456");
  });

  it("prefers VITE_SENTRY_RELEASE_DIST over SENTRY_RELEASE_DIST", () => {
    expect(
      resolveSentryReleaseDist({
        VITE_SENTRY_RELEASE_DIST: "vite-sha",
        SENTRY_RELEASE_DIST: "other-sha",
      }),
    ).toBe("vite-sha");
  });

  it("returns undefined when unset or blank", () => {
    expect(resolveSentryReleaseDist({})).toBeUndefined();
    expect(resolveSentryReleaseDist({ VITE_SENTRY_RELEASE_DIST: "  " })).toBeUndefined();
    expect(resolveSentryReleaseDist({ SENTRY_RELEASE_DIST: "" })).toBeUndefined();
  });
});
