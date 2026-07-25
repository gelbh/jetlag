import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { GameAreaGeometry, PolygonFeature } from "./types";

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

export function bboxFromGameArea(gameArea: GameAreaGeometry): {
  west: number;
  east: number;
  south: number;
  north: number;
} {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;

  const rings =
    gameArea.type === "Polygon"
      ? gameArea.coordinates
      : gameArea.coordinates.flatMap((polygon) => polygon);

  for (const ring of rings) {
    for (const position of ring) {
      const lng = position[0];
      const lat = position[1];
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    }
  }

  if (
    !Number.isFinite(west) ||
    !Number.isFinite(east) ||
    !Number.isFinite(south) ||
    !Number.isFinite(north)
  ) {
    return { west: 0, east: 0, south: 0, north: 0 };
  }

  return { west, east, south, north };
}

/** Non-throwing grid PIP topology compare for dual-run. */
export function maskTopologyMatches(
  candidate: PolygonFeature | null,
  baseline: PolygonFeature | null,
  bbox: { west: number; east: number; south: number; north: number },
  steps = 12,
): boolean {
  if (candidate === null && baseline === null) {
    return true;
  }
  if (candidate === null || baseline === null) {
    return false;
  }

  const points = sampleGridPoints(
    bbox.west,
    bbox.east,
    bbox.south,
    bbox.north,
    steps,
  );

  for (const sample of points) {
    if (
      booleanPointInPolygon(sample, candidate) !==
      booleanPointInPolygon(sample, baseline)
    ) {
      return false;
    }
  }

  return true;
}

/** Grid point-in-polygon agreement for dual-run / WASM parity tests. */
export function assertPolygonTopologyParity(
  candidate: PolygonFeature | null,
  baseline: PolygonFeature | null,
  bbox: { west: number; east: number; south: number; north: number },
  steps = 12,
): void {
  if (candidate === null || baseline === null) {
    throw new Error("Expected non-null polygons for topology parity");
  }
  if (!maskTopologyMatches(candidate, baseline, bbox, steps)) {
    throw new Error("Polygon topology parity mismatch on sample grid");
  }
}
