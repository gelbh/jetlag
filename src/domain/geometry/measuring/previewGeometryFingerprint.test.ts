import { describe, expect, it } from "vitest";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import { previewGeometryFingerprint } from "./previewGeometryFingerprint";

function samplePolygon(): Feature<Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
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
}

describe("previewGeometryFingerprint", () => {
  it("returns null for a missing preview", () => {
    expect(previewGeometryFingerprint(null)).toBeNull();
  });

  it("does not JSON.stringify full geometry", () => {
    const feature = samplePolygon();
    const fingerprint = previewGeometryFingerprint(feature);

    expect(fingerprint).not.toBeNull();
    expect(fingerprint).not.toContain(JSON.stringify(feature.geometry));
    expect(fingerprint).toMatch(/^Polygon:/);
    expect(fingerprint).toContain(":5:");
  });

  it("changes when bbox or coordinate count changes", () => {
    const first = previewGeometryFingerprint(samplePolygon());
    const shifted: Feature<Polygon> = {
      ...samplePolygon(),
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-0.19, 51.41],
            [-0.09, 51.41],
            [-0.09, 51.51],
            [-0.19, 51.51],
            [-0.19, 51.41],
          ],
        ],
      },
    };
    const second = previewGeometryFingerprint(shifted);

    expect(first).not.toBe(second);
  });

  it("supports MultiPolygon previews", () => {
    const multi: Feature<MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-0.2, 51.4],
              [-0.15, 51.4],
              [-0.15, 51.45],
              [-0.2, 51.45],
              [-0.2, 51.4],
            ],
          ],
          [
            [
              [-0.14, 51.4],
              [-0.1, 51.4],
              [-0.1, 51.45],
              [-0.14, 51.45],
              [-0.14, 51.4],
            ],
          ],
        ],
      },
    };

    expect(previewGeometryFingerprint(multi)).toMatch(/^MultiPolygon:/);
  });

  it("does not RangeError on MultiPolygons with >200K coordinates", () => {
    const coordCount = 200_000;
    const ring: [number, number][] = Array.from({ length: coordCount }, (_, i) => [
      -6.26 + (i % 100) * 0.001,
      53.35 + Math.floor(i / 100) * 0.001,
    ]);
    ring.push(ring[0]!);

    const dense: Feature<MultiPolygon> = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "MultiPolygon",
        coordinates: [[ring]],
      },
    };

    const fingerprint = previewGeometryFingerprint(dense);
    expect(fingerprint).toMatch(/^MultiPolygon:/);
    expect(fingerprint).toContain(`:${coordCount + 1}:`);
  });
});
