import { describe, expect, it } from "vitest";
import { pickLatestNotice } from "./useIncidentResolvedBanner";
import type { IncidentNotice } from "../../services/firestore/firestoreIncidentNotices";

function notice(incidentId: string, resolvedAt: string): IncidentNotice {
  return {
    incidentId,
    status: "resolved",
    resolvedAt,
    bannerDismissedAt: null,
  };
}

describe("pickLatestNotice", () => {
  it("returns null for an empty list", () => {
    expect(pickLatestNotice([])).toBeNull();
  });

  it("returns the notice with the latest resolvedAt", () => {
    const latest = pickLatestNotice([
      notice("inc-old", "2026-01-01T00:00:00.000Z"),
      notice("inc-new", "2026-09-13T12:00:00.000Z"),
      notice("inc-mid", "2026-06-01T00:00:00.000Z"),
    ]);
    expect(latest?.incidentId).toBe("inc-new");
  });
});
