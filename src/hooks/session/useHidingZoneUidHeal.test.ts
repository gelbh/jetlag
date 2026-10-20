import { describe, expect, it } from "vitest";
import type { HidingZoneRecord } from "@/domain/session/hiding/hidingZone";
import { buildHidingZoneUidHealWrite } from "./useHidingZoneUidHeal";

const baseZone: HidingZoneRecord = {
  hiderUid: "old-uid",
  sessionId: "sess-1",
  stationId: "st-1",
  stationName: "Central",
  center: { lat: 53.3, lng: -6.2 },
  radiusMeters: 500,
  geometryJson: "{}",
  status: "confirmed",
  confirmedAt: "2026-01-01T00:00:00.000Z",
  moveInProgress: true,
};

describe("buildHidingZoneUidHealWrite", () => {
  it("retargets hiderUid and forces moveInProgress false", () => {
    const healed = buildHidingZoneUidHealWrite(baseZone, "new-uid");
    expect(healed.hiderUid).toBe("new-uid");
    expect(healed.moveInProgress).toBe(false);
    expect(healed.stationId).toBe(baseZone.stationId);
  });

  it("forces moveInProgress false even when stale zone omitted the flag", () => {
    const { moveInProgress: _omit, ...withoutFlag } = baseZone;
    const healed = buildHidingZoneUidHealWrite(withoutFlag, "new-uid");
    expect(healed.moveInProgress).toBe(false);
  });
});
