import { describe, expect, it } from "vitest";
import {
  buildMapTileUrl,
  latLngToTileXY,
  previewTileUrlsForStyle,
  previewTileUrlsFromOrigin,
} from "./mapTilePreview";
import { MAP_BASEMAPS } from "./mapBasemaps";

describe("mapTilePreview", () => {
  it("converts London center to stable tile coordinates at zoom 15", () => {
    expect(latLngToTileXY(51.505, -0.09, 15)).toEqual({ x: 16375, y: 10896 });
  });

  it("builds carto tile urls with subdomain rotation", () => {
    const url = buildMapTileUrl(MAP_BASEMAPS.standard, 16375, 10896, 15);

    expect(url).toMatch(
      /^https:\/\/[abcd]\.basemaps\.cartocdn\.com\/rastertiles\/voyager\/15\/16375\/10896\.png$/,
    );
  });

  it("builds esri satellite tile urls", () => {
    const url = buildMapTileUrl(MAP_BASEMAPS.satellite, 16375, 10896, 15);

    expect(url).toBe(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/15/10896/16375",
    );
  });

  it("returns four preview tiles for the alternate basemap", () => {
    const urls = previewTileUrlsForStyle("satellite", 51.505, -0.09);

    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url.includes("World_Imagery"))).toBe(true);
  });

  it("builds preview tiles from a fixed tile origin", () => {
    const urls = previewTileUrlsFromOrigin("standard", 16375, 10896);

    expect(urls).toHaveLength(4);
    expect(urls[0]).toMatch(/15\/16375\/10896/);
    expect(urls[3]).toMatch(/15\/16376\/10897/);
  });
});
