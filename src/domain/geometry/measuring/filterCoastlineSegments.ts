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

function intersectsHorizontalBboxEdge(
  start: [number, number],
  end: [number, number],
  latitude: number,
  west: number,
  east: number,
): boolean {
  const latitudeDelta = end[1] - start[1];
  if (Math.abs(latitudeDelta) <= BBOX_EDGE_EPSILON) {
    return (
      Math.abs(start[1] - latitude) <= BBOX_EDGE_EPSILON &&
      Math.max(start[0], end[0]) >= west - BBOX_EDGE_EPSILON &&
      Math.min(start[0], end[0]) <= east + BBOX_EDGE_EPSILON
    );
  }

  const intersectionRatio = (latitude - start[1]) / latitudeDelta;
  if (intersectionRatio < 0 || intersectionRatio > 1) {
    return false;
  }

  const longitude = start[0] + intersectionRatio * (end[0] - start[0]);
  return longitude >= west - BBOX_EDGE_EPSILON && longitude <= east + BBOX_EDGE_EPSILON;
}

function intersectsVerticalBboxEdge(
  start: [number, number],
  end: [number, number],
  longitude: number,
  south: number,
  north: number,
): boolean {
  const longitudeDelta = end[0] - start[0];
  if (Math.abs(longitudeDelta) <= BBOX_EDGE_EPSILON) {
    return (
      Math.abs(start[0] - longitude) <= BBOX_EDGE_EPSILON &&
      Math.max(start[1], end[1]) >= south - BBOX_EDGE_EPSILON &&
      Math.min(start[1], end[1]) <= north + BBOX_EDGE_EPSILON
    );
  }

  const intersectionRatio = (longitude - start[0]) / longitudeDelta;
  if (intersectionRatio < 0 || intersectionRatio > 1) {
    return false;
  }

  const latitude = start[1] + intersectionRatio * (end[1] - start[1]);
  return latitude >= south - BBOX_EDGE_EPSILON && latitude <= north + BBOX_EDGE_EPSILON;
}

function touchesBboxEdge(segment: Feature<LineString>, bbox: BoundingBox): boolean {
  const coordinates = segment.geometry.coordinates;
  if (
    coordinates.some(([longitude, latitude]) => {
      return (
        Math.abs(latitude - bbox.south) <= BBOX_EDGE_EPSILON ||
        Math.abs(longitude - bbox.west) <= BBOX_EDGE_EPSILON ||
        Math.abs(latitude - bbox.north) <= BBOX_EDGE_EPSILON ||
        Math.abs(longitude - bbox.east) <= BBOX_EDGE_EPSILON
      );
    })
  ) {
    return true;
  }

  return coordinates.some((start, index) => {
    const end = coordinates[index + 1];
    if (end === undefined) {
      return false;
    }

    return (
      intersectsHorizontalBboxEdge(start, end, bbox.south, bbox.west, bbox.east) ||
      intersectsHorizontalBboxEdge(start, end, bbox.north, bbox.west, bbox.east) ||
      intersectsVerticalBboxEdge(start, end, bbox.west, bbox.south, bbox.north) ||
      intersectsVerticalBboxEdge(start, end, bbox.east, bbox.south, bbox.north)
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
