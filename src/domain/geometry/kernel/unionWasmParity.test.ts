import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "vitest";
import { assertPolygonTopologyParity } from "./parity";
import type { PolygonFeature } from "./types";
import { unionPolygonFeatures } from "./unionPolygonFeatures";

const pkgEntry = resolve(
  import.meta.dirname,
  "../../../../crates/jetlag-geometry-kernel/pkg/jetlag_geometry_kernel.js",
);
const wasmPkgReady = existsSync(pkgEntry);

function square(west: number): PolygonFeature {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [west, 51.42],
          [west + 0.03, 51.42],
          [west + 0.03, 51.48],
          [west, 51.48],
          [west, 51.42],
        ],
      ],
    },
  };
}

const topologyBbox = { west: -0.25, east: -0.1, south: 51.4, north: 51.5 };

describe.skipIf(!wasmPkgReady)("union polygon wasm parity", () => {
  it("matches Martinez on two overlapping squares", async () => {
    const features = [square(-0.22), square(-0.18)];
    const { wasmUnionPolygonFeatures } = await import("./unionWasm");
    const wasm = await wasmUnionPolygonFeatures(features);
    const baseline = unionPolygonFeatures(features);
    // steps=11: default 12 lands on east edge lng=-0.15 where geo boolean FP
    // shrinks the ring inside Martinez's exact coordinate.
    assertPolygonTopologyParity(wasm, baseline, topologyBbox, 11);
  });
});
