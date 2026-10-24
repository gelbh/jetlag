import { describe, expect, it } from "vitest";
import {
  playAreaCategoryPresenceProbeSpecs,
  resolveCategoryPresence,
} from "./playAreaCategoryPresence";

describe("resolveCategoryPresence", () => {
  it("marks denylisted categories unavailable first", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "high_speed_rail_line",
        regionPackId: "dublin",
        probeCount: 5,
        adminUnavailable: false,
        reactiveUnavailable: false,
      }),
    ).toEqual({ available: false, reason: "denylist" });
  });

  it("marks admin-unavailable categories unavailable after denylist", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "admin_division_1",
        regionPackId: "tokyo",
        adminUnavailable: true,
        probeCount: 3,
      }),
    ).toEqual({ available: false, reason: "admin" });
  });

  it("marks reactive-unavailable after admin", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "zoo",
        regionPackId: "tokyo",
        reactiveUnavailable: true,
        probeCount: 2,
      }),
    ).toEqual({ available: false, reason: "reactive" });
  });

  it("marks probe count 0 unavailable when probe result is present", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "zoo",
        regionPackId: "tokyo",
        probeCount: 0,
      }),
    ).toEqual({ available: false, reason: "probe" });
  });

  it("stays available while probe is pending even if count is 0", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "zoo",
        regionPackId: "tokyo",
        probeCount: 0,
        probePending: true,
      }),
    ).toEqual({ available: true });
  });

  it("stays available when probeCount is undefined (avoid flash-grey)", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "zoo",
        regionPackId: "tokyo",
      }),
    ).toEqual({ available: true });
  });

  it("stays available for non-zero probe counts", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "zoo",
        regionPackId: "tokyo",
        probeCount: 1,
      }),
    ).toEqual({ available: true });
  });

  it("never consults pack POI source:none stubs", () => {
    // resolveCategoryPresence has no stub/source input; emptiness is probe total === 0 only.
    expect(
      resolveCategoryPresence({
        categoryId: "zoo",
        regionPackId: "dublin",
        probeCount: 4,
      }),
    ).toEqual({ available: true });
  });

  it("keeps denylist ahead of probe zero", () => {
    expect(
      resolveCategoryPresence({
        categoryId: "high_speed_rail_line",
        regionPackId: "dublin",
        probeCount: 0,
      }).reason,
    ).toBe("denylist");
  });
});

describe("playAreaCategoryPresenceProbeSpecs", () => {
  it("includes OSM measuring/matching categories with selectors", () => {
    const specs = playAreaCategoryPresenceProbeSpecs();
    const byId = new Map(specs.map((spec) => [spec.id, spec]));

    expect(byId.get("zoo")?.selectors.length).toBeGreaterThan(0);
    expect(byId.get("high_speed_rail_line")?.selectors.length).toBeGreaterThan(0);
    expect(byId.get("commercial_airport")?.selectors.length).toBeGreaterThan(0);
  });

  it("skips coastline, sea_level, and admin-covered kinds", () => {
    const ids = new Set(playAreaCategoryPresenceProbeSpecs().map((spec) => spec.id));

    expect(ids.has("coastline")).toBe(false);
    expect(ids.has("sea_level")).toBe(false);
    expect(ids.has("admin1_border")).toBe(false);
    expect(ids.has("admin2_border")).toBe(false);
    expect(ids.has("admin3_border")).toBe(false);
    expect(ids.has("admin4_border")).toBe(false);
    expect(ids.has("admin_division_1")).toBe(false);
    expect(ids.has("admin_division_2")).toBe(false);
    expect(ids.has("admin_division_3")).toBe(false);
    expect(ids.has("admin_division_4")).toBe(false);
  });

  it("skips matching categories without Overpass selectors", () => {
    const ids = new Set(playAreaCategoryPresenceProbeSpecs().map((spec) => spec.id));

    expect(ids.has("landmass")).toBe(false);
    expect(ids.has("transit_line")).toBe(false);
    expect(ids.has("street_or_path")).toBe(false);
  });

  it("dedupes shared measuring/matching ids with unioned selectors", () => {
    const specs = playAreaCategoryPresenceProbeSpecs();
    const zooSpecs = specs.filter((spec) => spec.id === "zoo");
    expect(zooSpecs).toHaveLength(1);
    expect(zooSpecs[0]?.selectors.length).toBeGreaterThan(0);
  });
});
