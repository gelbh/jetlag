import type { Feature, Polygon as GeoPolygon, LineString, MultiPolygon, Point } from "geojson";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import { DEFAULT_RADIUS_METERS } from "@/domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";

export type GeometryEditModel =
  | {
      kind: "radar";
      center: LatLngTuple;
      radiusMeters: number;
      color: string;
    }
  | {
      kind: "pin";
      latitude: number;
      longitude: number;
      color: string;
    }
  | {
      kind: "thermometer";
      pointA: LatLngTuple;
      pointB: LatLngTuple;
      lineFeature: Feature<LineString>;
      axisColor: string;
      colorA: string;
      colorB: string;
    }
  | {
      kind: "zone";
      polygonFeature: Feature<GeoPolygon>;
      ringLatLng: LatLngTuple[];
      color: string;
    }
  | { kind: "empty" };

function asPoint(geometry: Feature["geometry"]): Point | null {
  return geometry.type === "Point" ? geometry : null;
}

function asLineString(geometry: Feature["geometry"]): LineString | null {
  return geometry.type === "LineString" ? geometry : null;
}

function asPolygon(geometry: Feature["geometry"]): GeoPolygon | null {
  return geometry.type === "Polygon" ? geometry : null;
}

export function buildGeometryEditModel(
  annotation: AnnotationRecord,
  draftGeometry: Feature<Point | LineString | GeoPolygon | MultiPolygon>,
  _gameArea: GameArea,
): GeometryEditModel {
  switch (annotation.type) {
    case "radar": {
      const point = asPoint(draftGeometry.geometry);
      if (!point) {
        return { kind: "empty" };
      }
      return {
        kind: "radar",
        center: [point.coordinates[1], point.coordinates[0]],
        radiusMeters: annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
        color: MAP_ANNOTATION_COLORS.radar,
      };
    }
    case "pin": {
      const point = asPoint(draftGeometry.geometry);
      if (!point) {
        return { kind: "empty" };
      }
      return {
        kind: "pin",
        latitude: point.coordinates[1],
        longitude: point.coordinates[0],
        color: MAP_ANNOTATION_COLORS.pin,
      };
    }
    case "thermometer": {
      const line = asLineString(draftGeometry.geometry);
      if (!line) {
        return { kind: "empty" };
      }
      const pointALngLat = line.coordinates[0];
      const pointBLngLat = line.coordinates[line.coordinates.length - 1];
      const pointA: LatLngTuple = [pointALngLat[1], pointALngLat[0]];
      const pointB: LatLngTuple = [pointBLngLat[1], pointBLngLat[0]];
      return {
        kind: "thermometer",
        pointA,
        pointB,
        lineFeature: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [pointALngLat, pointBLngLat],
          },
        },
        axisColor: MAP_ANNOTATION_COLORS.thermometerAxis,
        colorA: MAP_ANNOTATION_COLORS.thermometerA,
        colorB: MAP_ANNOTATION_COLORS.thermometerB,
      };
    }
    case "zone": {
      const polygon = asPolygon(draftGeometry.geometry);
      if (!polygon) {
        return { kind: "empty" };
      }
      const ringLatLng = polygon.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngTuple);
      return {
        kind: "zone",
        polygonFeature: { type: "Feature", properties: {}, geometry: polygon },
        ringLatLng,
        color: MAP_ANNOTATION_COLORS.zoneDraft,
      };
    }
    case "tentacle":
    case "measuring":
    case "matching":
    case "draw":
      return { kind: "empty" };
    default: {
      const exhaustive: never = annotation.type;
      void exhaustive;
      return { kind: "empty" };
    }
  }
}
