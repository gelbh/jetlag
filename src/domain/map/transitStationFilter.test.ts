import { describe, expect, it } from "vitest";
import { normalizeTransitStationFilter, stationModesMatchFilter } from "./transit";

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
