import { describe, expect, it } from "vitest";
import {
  isOpenFreeMapTileNoiseSpanName,
  OPEN_FREEMAP_TILE_IGNORE_SPAN,
} from "./sentryHostNoiseSpans";

describe("isOpenFreeMapTileNoiseSpanName", () => {
  it("matches OpenFreeMap tile descriptions", () => {
    expect(
      isOpenFreeMapTileNoiseSpanName(
        "GET https://tiles.openfreemap.org/natural_earth/ne2sr/6/33/24.png",
      ),
    ).toBe(true);
    expect(OPEN_FREEMAP_TILE_IGNORE_SPAN).toBe("tiles.openfreemap.org");
  });

  it("ignores non-tile hosts", () => {
    expect(isOpenFreeMapTileNoiseSpanName("GET https://api.open-meteo.com/v1/elevation")).toBe(
      false,
    );
  });
});
