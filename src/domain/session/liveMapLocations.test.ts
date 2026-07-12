import { describe, expect, it } from "vitest";
import {
  clusterNearbyPoints,
  clusterTooltipLabel,
  isHiderLocationRole,
  isSeekerLocationRole,
  LIVE_LOCATION_DEDUPE_METERS,
  locationClusterStableKey,
} from "./liveMapLocations";
import type { PlayerLocationRecord } from "./sessionChat";

function location(
  uid: string,
  lat: number,
  lng: number,
  role: PlayerLocationRecord["role"] = "seeker",
): PlayerLocationRecord {
  return {
    uid,
    sessionId: "session-1",
    lat,
    lng,
    updatedAt: "2026-01-01T00:00:00.000Z",
    role,
  };
}

describe("liveMapLocations", () => {
  it("clusters points within the dedupe radius", () => {
    const clusters = clusterNearbyPoints([
      location("seeker-1", 53.35, -6.26),
      location("seeker-2", 53.35001, -6.26001),
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.uids).toEqual(["seeker-1", "seeker-2"]);
    expect(clusters[0]?.lat).toBe(53.35);
    expect(clusters[0]?.lng).toBe(-6.26);
  });

  it("keeps distant points in separate clusters", () => {
    const clusters = clusterNearbyPoints([
      location("seeker-1", 53.35, -6.26),
      location("seeker-2", 53.36, -6.27),
    ]);

    expect(clusters).toHaveLength(2);
  });

  it("uses the configured dedupe radius", () => {
    const clusters = clusterNearbyPoints(
      [
        location("seeker-1", 53.35, -6.26),
        location("seeker-2", 53.3502, -6.2602),
      ],
      LIVE_LOCATION_DEDUPE_METERS,
    );

    expect(clusters).toHaveLength(1);
  });

  it("formats seeker and hider tooltip labels", () => {
    expect(clusterTooltipLabel(1, "seeker")).toBe("1 seeker");
    expect(clusterTooltipLabel(2, "seeker")).toBe("2 seekers");
    expect(clusterTooltipLabel(1, "hider")).toBe("1 hider");
    expect(clusterTooltipLabel(3, "hider")).toBe("3 hiders");
    expect(clusterTooltipLabel(1, "seeker", true)).toBe("You");
    expect(clusterTooltipLabel(1, "hider", true)).toBe("You");
  });

  it("treats missing role as seeker for filtering helpers", () => {
    expect(isSeekerLocationRole(undefined)).toBe(true);
    expect(isSeekerLocationRole("seeker")).toBe(true);
    expect(isSeekerLocationRole("hider")).toBe(false);
    expect(isHiderLocationRole(undefined)).toBe(false);
    expect(isHiderLocationRole("hider")).toBe(true);
  });

  it("builds stable cluster keys independent of uid order", () => {
    const clusterA = {
      lat: 53.35,
      lng: -6.26,
      uids: ["seeker-b", "seeker-a"],
      members: [location("seeker-b", 53.35, -6.26), location("seeker-a", 53.35, -6.26)],
    };
    const clusterB = {
      lat: 53.35,
      lng: -6.26,
      uids: ["seeker-a", "seeker-b"],
      members: [location("seeker-a", 53.35, -6.26), location("seeker-b", 53.35, -6.26)],
    };

    expect(locationClusterStableKey(clusterA)).toBe("seeker-a-seeker-b");
    expect(locationClusterStableKey(clusterB)).toBe("seeker-a-seeker-b");
    expect(locationClusterStableKey(clusterA)).toBe(locationClusterStableKey(clusterB));
  });

  it("uses different stable keys for different uid sets", () => {
    const clusterA = {
      lat: 53.35,
      lng: -6.26,
      uids: ["seeker-a"],
      members: [location("seeker-a", 53.35, -6.26)],
    };
    const clusterB = {
      lat: 53.35,
      lng: -6.26,
      uids: ["seeker-b"],
      members: [location("seeker-b", 53.35, -6.26)],
    };

    expect(locationClusterStableKey(clusterA)).not.toBe(
      locationClusterStableKey(clusterB),
    );
  });
});
