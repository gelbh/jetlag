import { describe, expect, it } from "vitest";
import {
  latLngToTileXY,
  mapStylePreviewAssetUrl,
  mapStylePreviewTileUrls,
  previewTileUrlsForStyle,
  previewTileUrlsFromOrigin,
} from "./mapTilePreview";

describe("mapTilePreview", () => {
  it("converts London center to stable tile coordinates at zoom 15", () => {
    expect(latLngToTileXY(51.505, -0.09, 15)).toEqual({ x: 16375, y: 10896 });
  });

  it("uses static street preview assets instead of remote tile URLs", () => {
    expect(mapStylePreviewAssetUrl("standard", "light")).toBe(
      "/map-preview/street-light.svg",
    );
    expect(mapStylePreviewAssetUrl("standard", "dark")).toBe(
      "/map-preview/street-dark.svg",
    );
    expect(mapStylePreviewAssetUrl("satellite", "light")).toBe(
      "/map-preview/satellite.svg",
    );
  });

  it("returns four static preview tiles for the style-toggle grid", () => {
    const urls = mapStylePreviewTileUrls("standard", "dark");

    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url === "/map-preview/street-dark.svg")).toBe(
      true,
    );
  });

  it("returns four preview tiles for the alternate basemap", () => {
    const urls = previewTileUrlsForStyle("satellite", 51.505, -0.09);

    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url === "/map-preview/satellite.svg")).toBe(
      true,
    );
  });

  it("ignores tile origin for static preview assets", () => {
    const urls = previewTileUrlsFromOrigin("standard", 16375, 10896, 15, "light");

    expect(urls).toHaveLength(4);
    expect(urls.every((url) => url === "/map-preview/street-light.svg")).toBe(
      true,
    );
  });
});
