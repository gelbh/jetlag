import type { Feature, LineString, Point } from "geojson";
import type { LatLngTuple } from "./core/types";

export function parseGeometryJson(
  geometryJson: string,
): Feature<Point | LineString> | null {
  try {
    return JSON.parse(geometryJson) as Feature<Point | LineString>;
  } catch {
    return null;
  }
}

export function parsePointGeometry(geometryJson: string): LatLngTuple | null {
  const geometry = parseGeometryJson(geometryJson);
  if (!geometry || geometry.geometry.type !== "Point") {
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
  if (!geometry || geometry.geometry.type !== "LineString") {
    return null;
  }

  return lineEndpointsFromFeature(geometry as Feature<LineString>);
}

export function pointFromGeometryFeature(
  feature: Feature<Point | LineString>,
): LatLngTuple | null {
  const geom = feature.geometry;
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
