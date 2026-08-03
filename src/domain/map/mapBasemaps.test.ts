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
  isEsriTileUrl,
  isMapTileHostname,
  isOpenFreeMapUrl,
} from "./mapTileHosts";

describe("mapBasemaps", () => {
  it("resolves light street to OpenFreeMap liberty style", () => {
    const basemap = getMapBasemap("standard", "light");
    expect(basemap.url).toBe(OPENFREEMAP_STYLE_URLS.light);
    expect(getBasemapSurface("standard", "light")).toBe("light");
  });

  it("resolves dark street to OpenFreeMap dark style", () => {
    const basemap = getMapBasemap("standard", "dark");
    expect(basemap.url).toBe(OPENFREEMAP_STYLE_URLS.dark);
    expect(getStreetBasemap("dark").url).toBe(OPENFREEMAP_STYLE_URLS.dark);
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
    expect(getBasemapAttributionText("standard")).toContain("OpenFreeMap");
    expect(getBasemapAttributionText("standard")).toContain(
      "openstreetmap.org/copyright",
    );
    expect(getBasemapAttributionText("satellite")).toContain("Esri");
  });

  it("resolves MapLibre OpenFreeMap styles and satellite hybrid raster style", () => {
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
      expect(sat.sources["esri-reference"].tiles[0]).toContain(
        "World_Boundaries_and_Places",
      );
      expect(sat.layers.map((layer) => layer.id)).toEqual([
        "esri-world-imagery",
        "esri-reference-labels",
      ]);
    }
  });
});

describe("mapTileHosts", () => {
  it("matches Esri imagery/reference and OpenFreeMap URLs", () => {
    expect(
      isEsriTileUrl(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/2/3",
      ),
    ).toBe(true);
    expect(
      isEsriTileUrl(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/1/2/3",
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
    expect(isMapTileHostname("server.arcgisonline.com")).toBe(true);
    expect(isMapTileHostname("tiles.openfreemap.org")).toBe(true);
    expect(isMapTileHostname("evil.arcgisonline.com.attacker.example")).toBe(
      false,
    );
    expect(isMapTileHostname("tile.openstreetmap.org")).toBe(false);
  });
});
