import { describe, expect, it } from "vitest";
import { isOpenFreeMapTileAbortSpan } from "./sentryHostNoiseSpans";

describe("isOpenFreeMapTileAbortSpan", () => {
  it("drops tiles.openfreemap.org http.client with missing status", () => {
    expect(
      isOpenFreeMapTileAbortSpan({
        op: "http.client",
        description: "GET https://tiles.openfreemap.org/natural_earth/ne2sr/6/33/24.png",
        data: { "http.url": "https://tiles.openfreemap.org/natural_earth/ne2sr/6/33/24.png" },
      }),
    ).toBe(true);
  });

  it("keeps tiles with HTTP error status", () => {
    expect(
      isOpenFreeMapTileAbortSpan({
        op: "http.client",
        description: "GET https://tiles.openfreemap.org/styles/liberty",
        data: {
          "http.url": "https://tiles.openfreemap.org/styles/liberty",
          "http.status_code": 500,
        },
      }),
    ).toBe(false);
  });

  it("keeps successful tiles", () => {
    expect(
      isOpenFreeMapTileAbortSpan({
        op: "http.client",
        data: {
          "http.url": "https://tiles.openfreemap.org/styles/liberty",
          "http.status_code": 200,
        },
      }),
    ).toBe(false);
  });

  it("ignores non-tile hosts", () => {
    expect(
      isOpenFreeMapTileAbortSpan({
        op: "http.client",
        data: { "http.url": "https://api.open-meteo.com/v1/elevation", "http.status_code": null },
      }),
    ).toBe(false);
  });
});
