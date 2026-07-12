import { describe, expect, it } from "vitest";
import {
  buildHidingZoneCircle,
  dedupeTransitStations,
  hiderStationCenter,
  nearestStation,
  resolveMyHidingZone,
} from "./hidingZone";
import type { HidingZoneRecord } from "./hidingZone";

describe("hidingZone", () => {
  const zone = (
    hiderUid: string,
    lat = 53.35,
    lng = -6.26,
  ): HidingZoneRecord => ({
    hiderUid,
    sessionId: "session-1",
    stationId: "station-1",
    stationName: "Test Station",
    center: { lat, lng },
    radiusMeters: 400,
    geometryJson: "{}",
    status: "confirmed",
    confirmedAt: "2026-01-01T00:00:00.000Z",
  });

  it("resolves a hiding zone by uid first", () => {
    const zones = [zone("hider-a"), zone("hider-b", 53.4, -6.3)];
    expect(resolveMyHidingZone(zones, "hider-b", ["hider-a", "hider-b"])).toEqual(
      zones[1],
    );
  });

  it("falls back to the sole member zone when uid changed after heal", () => {
    const zones = [zone("old-hider-uid")];
    expect(resolveMyHidingZone(zones, "new-hider-uid", ["new-hider-uid"])).toEqual(
      zones[0],
    );
  });

  it("returns station center from a zone", () => {
    expect(hiderStationCenter(zone("hider-a", 53.36, -6.27))).toEqual([
      53.36, -6.27,
    ]);
  });

  it("builds a circle polygon around a center point", () => {
    const circle = buildHidingZoneCircle([53.35, -6.26], 400);
    expect(circle.geometry.type).toBe("Polygon");
    expect(circle.geometry.coordinates[0]?.length).toBeGreaterThan(10);
  });

  it("snaps to the nearest station within range", () => {
    const stations = [
      { id: "a", name: "Alpha", lat: 53.35, lng: -6.26 },
      { id: "b", name: "Beta", lat: 53.4, lng: -6.3 },
    ];

    const nearest = nearestStation([53.3501, -6.2601], stations, 500);
    expect(nearest?.id).toBe("a");
  });

  it("collapses duplicate stations with the same name nearby", () => {
    const stations = [
      { id: "1", name: "Dublin Central", lat: 53.35, lng: -6.26 },
      { id: "2", name: "dublin central", lat: 53.35001, lng: -6.26001 },
      { id: "3", name: "North Station", lat: 53.38, lng: -6.3 },
    ];

    expect(dedupeTransitStations(stations)).toEqual([
      { id: "1", name: "Dublin Central", lat: 53.35, lng: -6.26 },
      { id: "3", name: "North Station", lat: 53.38, lng: -6.3 },
    ]);
  });

  it("keeps same-named stations that are far apart", () => {
    const stations = [
      { id: "1", name: "Central", lat: 53.35, lng: -6.26 },
      { id: "2", name: "Central", lat: 53.5, lng: -6.5 },
    ];

    expect(dedupeTransitStations(stations)).toHaveLength(2);
  });
});
