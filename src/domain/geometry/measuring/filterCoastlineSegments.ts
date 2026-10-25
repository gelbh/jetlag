import turfLength from "@turf/length";
import type { Feature, LineString } from "geojson";
import type { BoundingBox } from "../gameArea/gameAreaBounds";

const MIN_MEASURING_SEGMENT_LENGTH_METERS = 5;
const HARBOUR_LOOP_MAX_LENGTH_METERS = 5_000;
const BBOX_EDGE_EPSILON = 1e-6;

function isClosedRing(segment: Feature<LineString>): boolean {
  const coordinates = segment.geometry.coordinates;
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return (
    coordinates.length >= 4 &&
    first !== undefined &&
    last !== undefined &&
    first[0] === last[0] &&
    first[1] === last[1]
  );
}

function touchesBboxEdge(segment: Feature<LineString>, bbox: BoundingBox): boolean {
  return segment.geometry.coordinates.some(([longitude, latitude]) => {
    return (
      Math.abs(latitude - bbox.south) <= BBOX_EDGE_EPSILON ||
      Math.abs(longitude - bbox.west) <= BBOX_EDGE_EPSILON ||
      Math.abs(latitude - bbox.north) <= BBOX_EDGE_EPSILON ||
      Math.abs(longitude - bbox.east) <= BBOX_EDGE_EPSILON
    );
  });
}

export function filterCoastlineSegmentsForMeasuring(
  segments: Feature<LineString>[],
  bbox: BoundingBox,
): Feature<LineString>[] {
  return segments.filter((segment) => {
    const lengthMeters = turfLength(segment, { units: "meters" });
    if (lengthMeters < MIN_MEASURING_SEGMENT_LENGTH_METERS) {
      return false;
    }

    return (
      !isClosedRing(segment) ||
      lengthMeters >= HARBOUR_LOOP_MAX_LENGTH_METERS ||
      touchesBboxEdge(segment, bbox)
    );
  });
}
