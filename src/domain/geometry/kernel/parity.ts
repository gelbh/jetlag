import { expect } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { PolygonFeature } from "./types";

function sampleGridPoints(
  west: number,
  east: number,
  south: number,
  north: number,
  steps: number,
): ReturnType<typeof turfPoint>[] {
  const points: ReturnType<typeof turfPoint>[] = [];
  const lngStep = (east - west) / steps;
  const latStep = (north - south) / steps;

  for (let lngIndex = 0; lngIndex <= steps; lngIndex += 1) {
    for (let latIndex = 0; latIndex <= steps; latIndex += 1) {
      points.push(
        turfPoint([west + lngIndex * lngStep, south + latIndex * latStep]),
      );
    }
  }

  return points;
}

/** Grid point-in-polygon agreement for dual-run / future WASM parity. */
export function assertPolygonTopologyParity(
  candidate: PolygonFeature | null,
  baseline: PolygonFeature | null,
  bbox: { west: number; east: number; south: number; north: number },
  steps = 12,
): void {
  expect(candidate).not.toBeNull();
  expect(baseline).not.toBeNull();

  const points = sampleGridPoints(
    bbox.west,
    bbox.east,
    bbox.south,
    bbox.north,
    steps,
  );

  for (const sample of points) {
    expect(booleanPointInPolygon(sample, candidate!)).toBe(
      booleanPointInPolygon(sample, baseline!),
    );
  }
}
