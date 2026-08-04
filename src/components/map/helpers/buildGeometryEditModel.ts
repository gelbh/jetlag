import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import { DEFAULT_RADIUS_METERS } from "@/domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import {
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "@/domain/geometry/gameArea/geometry";

const TENTACLE_CIRCLE_STEPS = 64;

export type GeometryEditModel =
  | {
      kind: "radar";
      center: LatLngTuple;
      radiusMeters: number;
      color: string;
    }
  | {
      kind: "tentacle";
      center: LatLngTuple;
      searchRadiusMeters: number;
      color: string;
      outOfReach: boolean;
      noRadarDisk: Feature<GeoPolygon> | null;
      yesRadarOutside: Feature<GeoPolygon | MultiPolygon> | null;
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
      /** Closed ring as [lat, lng] tuples (Leaflet order). */
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
  gameArea: GameArea,
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
    case "tentacle": {
      const point = asPoint(draftGeometry.geometry);
      if (!point) {
        return { kind: "empty" };
      }
      const center: LatLngTuple = [
        point.coordinates[1],
        point.coordinates[0],
      ];
      const searchRadiusMeters =
        annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
      const color =
        annotation.metadata.color ?? MAP_ANNOTATION_COLORS.tentacle;
      const outOfReach = Boolean(annotation.metadata.tentacleOutOfReach);
      const searchCircle = turfCircle(
        turfPoint(point.coordinates),
        searchRadiusMeters / 1000,
        { steps: TENTACLE_CIRCLE_STEPS, units: "kilometers" },
      ) as Feature<GeoPolygon>;

      if (outOfReach) {
        return {
          kind: "tentacle",
          center,
          searchRadiusMeters,
          color,
          outOfReach: true,
          noRadarDisk: searchCircle,
          yesRadarOutside: null,
        };
      }

      return {
        kind: "tentacle",
        center,
        searchRadiusMeters,
        color,
        outOfReach: false,
        noRadarDisk: null,
        yesRadarOutside: safeDifference(
          gameAreaToPolygon(gameArea),
          searchCircle,
        ),
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
      const ringLatLng = polygon.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as LatLngTuple,
      );
      return {
        kind: "zone",
        polygonFeature: { type: "Feature", properties: {}, geometry: polygon },
        ringLatLng,
        color: MAP_ANNOTATION_COLORS.zoneDraft,
      };
    }
    case "measuring":
    case "matching":
      return { kind: "empty" };
    default: {
      const exhaustive: never = annotation.type;
      void exhaustive;
      return { kind: "empty" };
    }
  }
}
