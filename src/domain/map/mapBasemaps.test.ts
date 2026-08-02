import { describe, expect, it } from "vitest";
import {
  getBasemapAttributionText,
  getBasemapSurface,
  getMapBasemap,
  getMapLibreStyle,
  getStreetBasemap,
  OPENFREEMAP_STYLE_URLS,
} from "./mapBasemaps";
import {
  isCartoTileUrl,
  isEsriWorldImageryTileUrl,
  isMapTileHostname,
  isOpenFreeMapUrl,
} from "./mapTileHosts";
import { MAP_LIBRE_PLAY_READY } from "./mapLibrePlayReady";

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
    expect(getBasemapAttributionText("standard", "maplibre")).toContain(
      "OpenFreeMap",
    );
  });

  it("resolves MapLibre OpenFreeMap styles and satellite raster style", () => {
    expect(getMapLibreStyle("standard", "light")).toBe(
      OPENFREEMAP_STYLE_URLS.light,
    );
    expect(getMapLibreStyle("standard", "dark")).toBe(
      OPENFREEMAP_STYLE_URLS.dark,
    );
    const sat = getMapLibreStyle("satellite", "dark");
    expect(typeof sat).toBe("object");
    if (typeof sat === "object") {
      expect(sat.sources.esri.tiles[0]).toContain("World_Imagery");
    }
  });

  it("keeps MapLibre play gate off until overlay ports land", () => {
    expect(MAP_LIBRE_PLAY_READY).toBe(false);
  });
});

describe("mapTileHosts", () => {
  it("matches CARTO, Esri, and OpenFreeMap URLs", () => {
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
    expect(
      isOpenFreeMapUrl("https://tiles.openfreemap.org/styles/liberty"),
    ).toBe(true);
    expect(
      isOpenFreeMapUrl(
        "https://tiles.openfreemap.org.attacker.example/styles/liberty",
      ),
    ).toBe(false);
    expect(isMapTileHostname("a.basemaps.cartocdn.com")).toBe(true);
    expect(isMapTileHostname("server.arcgisonline.com")).toBe(true);
    expect(isMapTileHostname("tiles.openfreemap.org")).toBe(true);
    expect(isMapTileHostname("evil.arcgisonline.com.attacker.example")).toBe(
      false,
    );
    expect(isMapTileHostname("tile.openstreetmap.org")).toBe(false);
  });
});
