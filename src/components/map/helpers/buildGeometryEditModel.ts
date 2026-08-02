import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import { DEFAULT_RADIUS_METERS } from "../../../domain/map/distance";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "../../../domain/geometry/gameArea/geometry";

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

export function buildGeometryEditModel(
  annotation: AnnotationRecord,
  draftGeometry: Feature<Point | LineString | GeoPolygon | MultiPolygon>,
  gameArea: GameArea,
): GeometryEditModel {
  switch (annotation.type) {
    case "radar": {
      const point = draftGeometry.geometry as Point;
      return {
        kind: "radar",
        center: [point.coordinates[1], point.coordinates[0]],
        radiusMeters: annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS,
        color: MAP_ANNOTATION_COLORS.radar,
      };
    }
    case "tentacle": {
      const point = draftGeometry.geometry as Point;
      const center: LatLngTuple = [
        point.coordinates[1],
        point.coordinates[0],
      ];
      const searchRadiusMeters =
        annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
      const color =
        annotation.metadata.color ?? MAP_ANNOTATION_COLORS.tentacle;
      const outOfReach = Boolean(annotation.metadata.tentacleOutOfReach);

      if (outOfReach) {
        const noRadarDisk = turfCircle(
          turfPoint(point.coordinates),
          searchRadiusMeters / 1000,
          { steps: 64, units: "kilometers" },
        ) as Feature<GeoPolygon>;
        return {
          kind: "tentacle",
          center,
          searchRadiusMeters,
          color,
          outOfReach: true,
          noRadarDisk,
          yesRadarOutside: null,
        };
      }

      const radarCircle = turfCircle(
        turfPoint(point.coordinates),
        searchRadiusMeters / 1000,
        { steps: 64, units: "kilometers" },
      );
      return {
        kind: "tentacle",
        center,
        searchRadiusMeters,
        color,
        outOfReach: false,
        noRadarDisk: null,
        yesRadarOutside: safeDifference(
          gameAreaToPolygon(gameArea),
          radarCircle as Feature<GeoPolygon>,
        ),
      };
    }
    case "pin": {
      const point = draftGeometry.geometry as Point;
      return {
        kind: "pin",
        latitude: point.coordinates[1],
        longitude: point.coordinates[0],
        color: MAP_ANNOTATION_COLORS.pin,
      };
    }
    case "thermometer": {
      const line = draftGeometry.geometry as LineString;
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
      const polygon = draftGeometry.geometry as GeoPolygon;
      const ringLatLng = polygon.coordinates[0].map(
        ([lng, lat]) => [lat, lng] as LatLngTuple,
      );
      return {
        kind: "zone",
        polygonFeature: draftGeometry as Feature<GeoPolygon>,
        ringLatLng,
        color: MAP_ANNOTATION_COLORS.zoneDraft,
      };
    }
    case "measuring":
    case "matching":
      return { kind: "empty" };
  }
}
