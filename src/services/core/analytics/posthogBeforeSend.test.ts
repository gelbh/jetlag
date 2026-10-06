import type { CaptureResult } from "posthog-js";
import { beforeEach, describe, expect, it } from "vitest";
import { writeAnalyticsConsent } from "@/domain/device/consent/analyticsConsent";
import { posthogBeforeSend } from "./posthogBeforeSend";

function exceptionCapture(type: string, value: string): CaptureResult {
  return {
    uuid: "test-uuid",
    event: "$exception",
    properties: {
      $exception_list: [
        {
          type,
          value,
          mechanism: { handled: false, synthetic: true, type: "generic" },
        },
      ],
    },
  };
}

describe("posthogBeforeSend", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps $exception when consent is denied", () => {
    writeAnalyticsConsent("denied");
    const capture = { event: "$exception", properties: { $exception_list: [] } };
    expect(posthogBeforeSend(capture as CaptureResult)).not.toBeNull();
  });

  it("drops session_created when consent is denied", () => {
    writeAnalyticsConsent("denied");
    const capture = { event: "session_created", properties: {} };
    expect(posthogBeforeSend(capture as CaptureResult)).toBeNull();
  });

  it("keeps session_created when consent is granted", () => {
    writeAnalyticsConsent("granted");
    const capture = { event: "session_created", properties: {} };
    expect(posthogBeforeSend(capture as CaptureResult)).not.toBeNull();
  });

  it("drops noise $exception via filterPosthogException regardless of consent", () => {
    writeAnalyticsConsent("denied");
    expect(
      posthogBeforeSend(exceptionCapture("AbortError", "This operation was aborted")),
    ).toBeNull();
  });

  it("drops product events when consent is unset", () => {
    const capture: CaptureResult = {
      uuid: "test-uuid",
      event: "session_created",
      properties: {},
    };
    expect(posthogBeforeSend(capture)).toBeNull();
  });
});
