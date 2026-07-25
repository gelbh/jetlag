import { beforeEach, describe, expect, it } from "vitest";
import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "./analyticsConsent";

describe("analyticsConsent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to unset", () => {
    expect(readAnalyticsConsent()).toBe("unset");
  });

  it("round-trips granted and denied", () => {
    writeAnalyticsConsent("granted");
    expect(localStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe("granted");
    expect(readAnalyticsConsent()).toBe("granted");
    writeAnalyticsConsent("denied");
    expect(readAnalyticsConsent()).toBe("denied");
  });

  it("treats corrupt values as unset", () => {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, "maybe");
    expect(readAnalyticsConsent()).toBe("unset");
  });
});
