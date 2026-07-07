import { describe, expect, it } from "vitest";
import { lineString } from "@turf/helpers";
import buffer from "@turf/buffer";
import difference from "@turf/difference";
import { geodesicLineBuffer } from "./geodesicLineBuffer";

describe("geodesicLineBuffer", () => {
  it("splits a play area when subtracted from a vertical waterway", () => {
    const gameFeature = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-0.2, 51.4],
            [-0.1, 51.4],
            [-0.1, 51.5],
            [-0.2, 51.5],
            [-0.2, 51.4],
          ],
        ],
      },
    };
    const line = lineString([
      [-0.15, 51.4],
      [-0.15, 51.5],
    ]);
    const buffered = geodesicLineBuffer(line, 2);
    expect(buffered).not.toBeNull();

    const remaining = difference({
      type: "FeatureCollection",
      features: [gameFeature, buffered!],
    });
    const turfBuffered = buffer(line, 2, { units: "meters" });
    expect(turfBuffered).toBeDefined();
    const turfRemaining = difference({
      type: "FeatureCollection",
      features: [gameFeature, turfBuffered!],
    });

    expect(turfRemaining?.geometry.type).toBe("MultiPolygon");
    expect(remaining?.geometry.type).toBe("MultiPolygon");
  });
});
