import { describe, expect, it } from "vitest";
import {
  scrubPosthogExceptionProperties,
  scrubString,
  scrubTelemetryError,
} from "./telemetryScrub";

describe("telemetryScrub", () => {
  it("redacts session-code-like tokens in strings", () => {
    expect(scrubString("Join ABCD failed")).toBe("Join **** failed");
  });

  it("scrubs Error message and stack without mutating the original", () => {
    const original = new Error("Join ABCD failed");
    original.stack = "Error: Join ABCD failed\n    at join (session.ts:1)";
    const scrubbed = scrubTelemetryError(original) as Error;

    expect(scrubbed).not.toBe(original);
    expect(scrubbed.message).toBe("Join **** failed");
    expect(scrubbed.stack).toContain("Join **** failed");
    expect(original.message).toBe("Join ABCD failed");
  });

  it("scrubs $exception_list values on PostHog exception properties", () => {
    const scrubbed = scrubPosthogExceptionProperties({
      $exception_list: [
        {
          type: "Error",
          value: "Join ABCD failed for session WXYZ",
          mechanism: { handled: false },
        },
      ],
      $exception_message: "Join ABCD failed",
      sessionId: "s-1",
    });

    expect(scrubbed?.$exception_message).toBe("Join **** failed");
    expect(scrubbed?.sessionId).toBe("[redacted]");
    const list = scrubbed?.$exception_list as Array<{ value: string }>;
    expect(list[0]?.value).toBe("Join **** failed for session ****");
  });
});
