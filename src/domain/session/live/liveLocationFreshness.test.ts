import { describe, expect, it } from "vitest";
import {
  LIVE_LOCATION_GONE_MS,
  formatLiveLocationLastSeen,
  isLiveLocationGone,
  liveClusterPresentation,
  liveLocationAgeMs,
  liveLocationFillOpacity,
  oldestLiveLocationUpdatedAt,
} from "./liveLocationFreshness";

const NOW = Date.parse("2026-08-02T12:00:00.000Z");

function isoAgo(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe("liveLocationFreshness", () => {
  it("computes age and treats invalid timestamps as null", () => {
    expect(liveLocationAgeMs(isoAgo(90_000), NOW)).toBe(90_000);
    expect(liveLocationAgeMs("not-a-date", NOW)).toBeNull();
  });

  it("marks locations gone at exactly 60 minutes", () => {
    expect(isLiveLocationGone(isoAgo(LIVE_LOCATION_GONE_MS - 1), NOW)).toBe(
      false,
    );
    expect(isLiveLocationGone(isoAgo(LIVE_LOCATION_GONE_MS), NOW)).toBe(true);
    expect(isLiveLocationGone("bad", NOW)).toBe(true);
  });

  it("fades opacity linearly until gone", () => {
    expect(liveLocationFillOpacity(isoAgo(0), NOW)).toBe(1);
    expect(liveLocationFillOpacity(isoAgo(LIVE_LOCATION_GONE_MS / 2), NOW)).toBe(
      0.5,
    );
    expect(liveLocationFillOpacity(isoAgo(LIVE_LOCATION_GONE_MS), NOW)).toBe(0);
  });

  it("picks the oldest updatedAt among members", () => {
    expect(
      oldestLiveLocationUpdatedAt([
        isoAgo(60_000),
        isoAgo(180_000),
        isoAgo(30_000),
      ]),
    ).toBe(isoAgo(180_000));
    expect(oldestLiveLocationUpdatedAt([])).toBeNull();
  });

  it("formats last-seen copy via admin freshness ages", () => {
    expect(formatLiveLocationLastSeen(isoAgo(15_000), NOW)).toBe(
      "Last seen just now",
    );
    expect(formatLiveLocationLastSeen(isoAgo(90_000), NOW)).toBe(
      "Last seen 1m ago",
    );
    expect(formatLiveLocationLastSeen(isoAgo(7 * 60_000), NOW)).toBe(
      "Last seen 7m ago",
    );
    expect(formatLiveLocationLastSeen("bad", NOW)).toBe("Last seen unknown");
  });

  it("builds cluster presentation from the oldest member", () => {
    const presentation = liveClusterPresentation(
      [isoAgo(60_000), isoAgo(180_000)],
      NOW,
    );
    expect(presentation.fillOpacity).toBe(
      liveLocationFillOpacity(isoAgo(180_000), NOW),
    );
    expect(presentation.lastSeenLabel).toBe("Last seen 3m ago");
  });

  it("hides an empty cluster presentation", () => {
    expect(liveClusterPresentation([], NOW)).toEqual({
      fillOpacity: 0,
      lastSeenLabel: null,
    });
  });
});
