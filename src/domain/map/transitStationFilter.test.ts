import { describe, expect, it } from "vitest";
import {
  normalizeTransitStationFilter,
  stationModesMatchFilter,
  toggleTransitStationMode,
  toTransitStationFilterWire,
} from "./transit";

describe("normalizeTransitStationFilter", () => {
  it("maps legacy string metro to single-element array", () => {
    expect(normalizeTransitStationFilter("metro")).toEqual(["metro"]);
  });
  it("maps all and empty array to all", () => {
    expect(normalizeTransitStationFilter("all")).toBe("all");
    expect(normalizeTransitStationFilter([])).toBe("all");
    expect(normalizeTransitStationFilter(undefined)).toBe("all");
  });
  it("dedupes and sorts mode arrays", () => {
    expect(normalizeTransitStationFilter(["tram", "metro", "tram"])).toEqual(["metro", "tram"]);
  });
  it("rejects unknown tokens as all (reject to all for deserialize safety)", () => {
    expect(normalizeTransitStationFilter("spaceship")).toBe("all");
    expect(normalizeTransitStationFilter(["spaceship"])).toBe("all");
    expect(normalizeTransitStationFilter(["metro", "spaceship"])).toEqual(["metro"]);
  });
});

describe("toTransitStationFilterWire", () => {
  it("omits all, writes single as string, multi as array", () => {
    expect(toTransitStationFilterWire("all")).toBeUndefined();
    expect(toTransitStationFilterWire(["metro"])).toBe("metro");
    expect(toTransitStationFilterWire(["metro", "tram"])).toEqual(["metro", "tram"]);
  });
});

describe("toggleTransitStationMode", () => {
  it("All chip resets to all", () => {
    expect(toggleTransitStationMode(["metro", "tram"], "all")).toBe("all");
  });
  it("adds a mode from all", () => {
    expect(toggleTransitStationMode("all", "tram")).toEqual(["tram"]);
  });
  it("adds a second mode and sorts", () => {
    expect(toggleTransitStationMode(["tram"], "metro")).toEqual(["metro", "tram"]);
  });
  it("removes a mode; last mode off returns all", () => {
    expect(toggleTransitStationMode(["metro", "tram"], "tram")).toEqual(["metro"]);
    expect(toggleTransitStationMode(["metro"], "metro")).toBe("all");
  });
});

describe("stationModesMatchFilter", () => {
  it("all matches any", () => {
    expect(stationModesMatchFilter(new Set(["bus"]), "all")).toBe(true);
  });
  it("OR across selected modes", () => {
    expect(stationModesMatchFilter(new Set(["tram", "bus"]), ["metro", "tram"])).toBe(true);
    expect(stationModesMatchFilter(new Set(["ferry"]), ["metro", "tram"])).toBe(false);
  });
});
