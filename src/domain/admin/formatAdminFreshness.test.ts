import { describe, expect, it } from "vitest";
import { formatFreshnessAge } from "./formatAdminFreshness";

describe("formatFreshnessAge", () => {
  const nowMs = Date.parse("2026-01-01T01:00:00.000Z");

  it("formats recent activity", () => {
    expect(
      formatFreshnessAge("2026-01-01T00:59:30.000Z", nowMs),
    ).toBe("just now");
    expect(
      formatFreshnessAge("2026-01-01T00:45:00.000Z", nowMs),
    ).toBe("15m ago");
  });

  it("handles missing timestamps", () => {
    expect(formatFreshnessAge(null, nowMs)).toBe("never");
  });
});
