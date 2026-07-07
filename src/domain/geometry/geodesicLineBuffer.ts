import type { Feature, LineString, Polygon } from "geojson";
import { point as turfPoint } from "@turf/helpers";
import turfDistance from "@turf/distance";
import { bearingDegrees, destinationPoint, type LatLngTuple } from "./geometryCore";

const DEFAULT_SAMPLE_SPACING_METERS = 25;

function sampleSpacingForBuffer(
  distanceMeters: number,
  sampleSpacingMeters: number,
): number {
  return Math.min(
    sampleSpacingMeters,
    Math.max(distanceMeters * 0.5, 1),
  );
}

function sampleLineCoordinates(
  coordinates: [number, number][],
  spacingMeters: number,
): [number, number][] {
  if (coordinates.length < 2) {
    return coordinates;
  }

  const sampled: [number, number][] = [[coordinates[0]![0], coordinates[0]![1]]];
  let carry = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    const start = coordinates[index - 1]!;
    const end = coordinates[index]!;
    const segmentMeters = turfDistance(
      turfPoint(start),
      turfPoint(end),
      { units: "meters" },
    );

    if (segmentMeters <= 0) {
      continue;
    }

    let traveled = 0;
    while (carry + (segmentMeters - traveled) >= spacingMeters) {
      const remaining = spacingMeters - carry;
      traveled += remaining;
      carry = 0;
      const fraction = traveled / segmentMeters;
      sampled.push([
        start[0] + (end[0] - start[0]) * fraction,
        start[1] + (end[1] - start[1]) * fraction,
      ]);
    }

    carry += segmentMeters - traveled;
  }

  const last = coordinates.at(-1);
  const tail = sampled.at(-1);
  if (last && (tail?.[0] !== last[0] || tail?.[1] !== last[1])) {
    sampled.push([last[0], last[1]]);
  }

  return sampled;
}

function extendLineEnds(
  coordinates: [number, number][],
  extensionMeters: number,
): [number, number][] {
  if (coordinates.length < 2 || extensionMeters <= 0) {
    return coordinates;
  }

  const first = coordinates[0]!;
  const second = coordinates[1]!;
  const beforeLast = coordinates.at(-2)!;
  const last = coordinates.at(-1)!;
  const startAnchor: LatLngTuple = [first[1], first[0]];
  const endAnchor: LatLngTuple = [last[1], last[0]];
  const startBearing =
    (bearingDegrees(startAnchor, [second[1], second[0]]) + 180) % 360;
  const endBearing = bearingDegrees(
    [beforeLast[1], beforeLast[0]],
    endAnchor,
  );
  const extendedStart = destinationPoint(
    startAnchor,
    extensionMeters,
    startBearing,
  );
  const extendedEnd = destinationPoint(
    endAnchor,
    extensionMeters,
    endBearing,
  );

  return [
    [extendedStart[1], extendedStart[0]],
    ...coordinates,
    [extendedEnd[1], extendedEnd[0]],
  ];
}

export function geodesicLineBuffer(
  segment: Feature<LineString>,
  distanceMeters: number,
  sampleSpacingMeters = DEFAULT_SAMPLE_SPACING_METERS,
): Feature<Polygon> | null {
  const spacing = sampleSpacingForBuffer(distanceMeters, sampleSpacingMeters);
  const extendedCoordinates = extendLineEnds(
    segment.geometry.coordinates as [number, number][],
    distanceMeters,
  );
  const sampled =
    extendedCoordinates.length === 2
      ? extendedCoordinates
      : sampleLineCoordinates(extendedCoordinates, spacing);

  if (sampled.length < 2) {
    return null;
  }

  const leftRing: [number, number][] = [];
  const rightRing: [number, number][] = [];

  for (let index = 0; index < sampled.length; index += 1) {
    const [lng, lat] = sampled[index]!;
    const anchor: LatLngTuple = [lat, lng];
    let bearing = 0;

    if (index < sampled.length - 1) {
      const next = sampled[index + 1]!;
      bearing = bearingDegrees(anchor, [next[1], next[0]]);
    } else if (index > 0) {
      const previous = sampled[index - 1]!;
      bearing = bearingDegrees([previous[1], previous[0]], anchor);
    }

    const left = destinationPoint(anchor, distanceMeters, bearing + 90);
    const right = destinationPoint(anchor, distanceMeters, bearing - 90);
    leftRing.push([left[1], left[0]]);
    rightRing.push([right[1], right[0]]);
  }

  const ring = [...rightRing, ...[...leftRing].reverse(), rightRing[0]!];
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}
