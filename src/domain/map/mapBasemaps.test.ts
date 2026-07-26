import { describe, expect, it } from "vitest";
import {
  getBasemapSurface,
  getMapBasemap,
  getStreetBasemap,
} from "./mapBasemaps";

describe("mapBasemaps", () => {
  it("resolves light street to Carto voyager", () => {
    const basemap = getMapBasemap("standard", "light");
    expect(basemap.url).toContain("rastertiles/voyager");
    expect(getBasemapSurface("standard", "light")).toBe("light");
  });

  it("resolves dark street to Carto dark_all", () => {
    const basemap = getMapBasemap("standard", "dark");
    expect(basemap.url).toContain("dark_all");
    expect(getStreetBasemap("dark").url).toContain("dark_all");
    expect(getBasemapSurface("standard", "dark")).toBe("dark");
  });

  it("ignores street theme for satellite tiles", () => {
    const light = getMapBasemap("satellite", "light");
    const dark = getMapBasemap("satellite", "dark");
    expect(light.url).toBe(dark.url);
    expect(light.url).toContain("World_Imagery");
    expect(getBasemapSurface("satellite", "dark")).toBe("satellite");
  });

  it("exposes an overlays extension point", () => {
    expect(getMapBasemap("standard", "light").overlays).toEqual([]);
    expect(getMapBasemap("satellite", "light").overlays).toEqual([]);
  });
});
