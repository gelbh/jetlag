import { describe, expect, it } from "vitest";
import { isReclaimableSessionForCode } from "./firestoreAnnotations";

describe("isReclaimableSessionForCode", () => {
  it("reclaims missing sessions", () => {
    expect(isReclaimableSessionForCode(null)).toBe(true);
    expect(isReclaimableSessionForCode(undefined)).toBe(true);
  });

  it("reclaims ended sessions", () => {
    expect(isReclaimableSessionForCode({ status: "ended" })).toBe(true);
    expect(
      isReclaimableSessionForCode({ endedAt: "2026-01-01T00:00:00.000Z" }),
    ).toBe(true);
  });

  it("does not reclaim live active sessions", () => {
    expect(isReclaimableSessionForCode({ status: "active" })).toBe(false);
  });
});
