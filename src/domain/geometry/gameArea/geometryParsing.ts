import type { Feature, LineString, Point } from "geojson";
import type { LatLngTuple } from "../core/types";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPointCoordinates(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    isFiniteNumber(value[0]) &&
    isFiniteNumber(value[1])
  );
}

function isLineStringCoordinates(value: unknown): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every((position) => isPointCoordinates(position))
  );
}

function isGeometryFeature(
  value: unknown,
): value is Feature<Point | LineString> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const feature = value as Feature;
  if (feature.type !== "Feature") {
    return false;
  }
  const geometry = feature.geometry;
  if (!geometry || typeof geometry !== "object") {
    return false;
  }
  if (geometry.type === "Point") {
    return isPointCoordinates(geometry.coordinates);
  }
  if (geometry.type === "LineString") {
    return isLineStringCoordinates(geometry.coordinates);
  }
  return false;
}

export function parseGeometryJson(
  geometryJson: string,
): Feature<Point | LineString> | null {
  try {
    const parsed: unknown = JSON.parse(geometryJson);
    return isGeometryFeature(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parsePointGeometry(geometryJson: string): LatLngTuple | null {
  const geometry = parseGeometryJson(geometryJson);
  if (!geometry || geometry.geometry?.type !== "Point") {
    return null;
  }

  const [lng, lat] = geometry.geometry.coordinates;
  return [lat, lng];
}

export function parseLineEndpoints(geometryJson: string): {
  start: LatLngTuple;
  end: LatLngTuple;
} | null {
  const geometry = parseGeometryJson(geometryJson);
  if (!geometry || geometry.geometry?.type !== "LineString") {
    return null;
  }

  return lineEndpointsFromFeature(geometry as Feature<LineString>);
}

export function pointFromGeometryFeature(
  feature: Feature<Point | LineString>,
): LatLngTuple | null {
  const geom = feature.geometry;
  if (!geom) {
    return null;
  }
  if (geom.type === "Point") {
    return [geom.coordinates[1], geom.coordinates[0]];
  }
  if (geom.type === "LineString" && geom.coordinates.length > 0) {
    const first = geom.coordinates[0];
    return [first[1], first[0]];
  }
  return null;
}

export function lineEndpointsFromFeature(
  feature: Feature<LineString>,
): { start: LatLngTuple; end: LatLngTuple } | null {
  const coords = feature.geometry.coordinates;
  if (coords.length < 2) {
    return null;
  }

  const first = coords[0];
  const last = coords[coords.length - 1];
  return {
    start: [first[1], first[0]],
    end: [last[1], last[0]],
  };
}
