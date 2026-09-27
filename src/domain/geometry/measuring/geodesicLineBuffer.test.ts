import { describe, expect, it } from "vitest";
import { lineString } from "@turf/helpers";
import buffer from "@turf/buffer";
import difference from "@turf/difference";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { runGeodesicLineBuffer } from "../kernel/geodesicKernelRunner";

const pkgEntry = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

describe.skipIf(!wasmPkgReady)("geodesicLineBuffer", () => {
  it("splits a play area when subtracted from a vertical waterway", async () => {
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
    const buffered = await runGeodesicLineBuffer(line, 2);
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

  it("rejects non-positive sample spacing", async () => {
    const line = {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "LineString" as const,
        coordinates: [
          [-0.15, 51.45],
          [-0.14, 51.46],
        ],
      },
    };
    await expect(runGeodesicLineBuffer(line, 200, 0)).rejects.toThrow(
      RangeError,
    );
  });
});
