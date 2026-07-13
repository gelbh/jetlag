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

  it("handles minute, hour, and day boundaries", () => {
    expect(
      formatFreshnessAge("2026-01-01T00:59:00.000Z", nowMs),
    ).toBe("1m ago");
    expect(
      formatFreshnessAge("2026-01-01T00:00:00.000Z", nowMs),
    ).toBe("1h ago");
    expect(
      formatFreshnessAge("2025-12-31T01:00:00.000Z", nowMs),
    ).toBe("1d ago");
  });

  it("handles missing, invalid, and future timestamps", () => {
    expect(formatFreshnessAge(null, nowMs)).toBe("never");
    expect(formatFreshnessAge("not-a-date", nowMs)).toBe("unknown");
    expect(
      formatFreshnessAge("2026-01-01T01:05:00.000Z", nowMs),
    ).toBe("just now");
  });
});
