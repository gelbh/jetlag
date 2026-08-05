import { describe, expect, it } from "vitest";
import {
  mapOpenMapTilesPoiToCategoryIds,
  openMapTilesPoiDisplayName,
} from "./openMapTilesPoiClassMap";

describe("openMapTilesPoiClassMap", () => {
  it("maps museum class to museum category", () => {
    expect(mapOpenMapTilesPoiToCategoryIds({ class: "museum", name: "MoMA" })).toEqual([
      "museum",
    ]);
  });

  it("maps hospital class but not clinic / nursing_home", () => {
    expect(mapOpenMapTilesPoiToCategoryIds({ class: "hospital" })).toEqual([
      "hospital",
    ]);
    expect(
      mapOpenMapTilesPoiToCategoryIds({
        class: "hospital",
        subclass: "hospital",
      }),
    ).toEqual(["hospital"]);
    // OMT stores clinics under class=hospital + subclass=clinic
    expect(
      mapOpenMapTilesPoiToCategoryIds({
        class: "hospital",
        subclass: "clinic",
      }),
    ).toEqual([]);
    expect(
      mapOpenMapTilesPoiToCategoryIds({
        class: "hospital",
        subclass: "nursing_home",
      }),
    ).toEqual([]);
    expect(mapOpenMapTilesPoiToCategoryIds({ class: "clinic" })).toEqual([]);
  });

  it("maps transit stop samples (railway / bus / subclass station)", () => {
    expect(mapOpenMapTilesPoiToCategoryIds({ class: "railway" })).toEqual([
      "rail_station",
    ]);
    expect(mapOpenMapTilesPoiToCategoryIds({ class: "bus" })).toEqual([
      "rail_station",
    ]);
    expect(
      mapOpenMapTilesPoiToCategoryIds({ class: "railway", subclass: "station" }),
    ).toEqual(["rail_station"]);
    expect(
      mapOpenMapTilesPoiToCategoryIds({ class: "bus", subclass: "bus_stop" }),
    ).toEqual(["rail_station"]);
  });

  it("returns empty for unknown class", () => {
    expect(mapOpenMapTilesPoiToCategoryIds({ class: "bakery" })).toEqual([]);
    expect(mapOpenMapTilesPoiToCategoryIds(null)).toEqual([]);
  });

  it("reads display name", () => {
    expect(openMapTilesPoiDisplayName({ name: "  Louvre  " })).toBe("Louvre");
    expect(openMapTilesPoiDisplayName({ name: "" })).toBeNull();
  });
});
