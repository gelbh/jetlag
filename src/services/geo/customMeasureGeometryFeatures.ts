import type { Feature, LineString, Polygon } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import {
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
} from "../../domain/geometry/geometry";
import type { SessionCustomMeasureGeometry } from "../../domain/session/customMeasureGeometry";
import { parseCustomMeasureGeometryFeature } from "../../domain/session/customMeasureGeometry";

function polygonOuterRingToLineString(
  polygon: Feature<Polygon>,
): Feature<LineString> | null {
  const ring = polygon.geometry.coordinates[0];
  if (!ring || ring.length < 2) {
    return null;
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: ring,
    },
  };
}

function geometryToLineSegments(
  feature: Feature<LineString | Polygon>,
): Feature<LineString>[] {
  if (feature.geometry.type === "LineString") {
    return [feature as Feature<LineString>];
  }

  const outline = polygonOuterRingToLineString(feature as Feature<Polygon>);
  return outline ? [outline] : [];
}

export async function loadCustomMeasureGeometryContext(
  seeker: LatLngTuple,
  gameArea: GameArea,
  geometry: SessionCustomMeasureGeometry,
): Promise<{
  point: LatLngTuple;
  distanceMeters: number;
  segments: Feature<LineString>[];
} | null> {
  const feature = parseCustomMeasureGeometryFeature(geometry);
  if (!feature) {
    return null;
  }

  const segments = geometryToLineSegments(feature);
  if (segments.length === 0) {
    return null;
  }

  const prepared = prepareMeasuringLineSegments(segments, gameArea);
  const nearest = nearestPointToCoastlines(seeker, prepared.segments, prepared);
  if (!nearest) {
    return null;
  }

  return {
    point: nearest.point,
    distanceMeters: nearest.distanceMeters,
    segments: prepared.segments,
  };
}
