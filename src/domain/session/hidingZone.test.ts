import { describe, expect, it } from "vitest";
import {
  buildHidingZoneCircle,
  dedupeTransitStations,
  nearestStation,
} from "./hidingZone";

describe("hidingZone", () => {
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
