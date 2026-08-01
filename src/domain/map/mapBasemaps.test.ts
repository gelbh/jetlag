import { describe, expect, it } from "vitest";
import {
  getBasemapAttributionText,
  getBasemapSurface,
  getMapBasemap,
  getStreetBasemap,
} from "./mapBasemaps";
import {
  isCartoTileUrl,
  isEsriWorldImageryTileUrl,
  isMapTileHostname,
} from "./mapTileHosts";

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

  it("returns plain-text attribution for settings chrome", () => {
    expect(getBasemapAttributionText("standard")).toContain("CARTO");
    expect(getBasemapAttributionText("satellite")).toContain("Esri");
  });
});

describe("mapTileHosts", () => {
  it("matches CARTO and Esri tile URLs", () => {
    expect(
      isCartoTileUrl(
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/1/2/3.png",
      ),
    ).toBe(true);
    expect(
      isEsriWorldImageryTileUrl(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/2/3",
      ),
    ).toBe(true);
    expect(isMapTileHostname("a.basemaps.cartocdn.com")).toBe(true);
    expect(isMapTileHostname("tile.openstreetmap.org")).toBe(false);
  });
});
