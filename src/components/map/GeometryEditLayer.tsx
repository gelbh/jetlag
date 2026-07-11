import { memo, useMemo } from "react";
import { Polygon, Polyline, CircleMarker } from "react-leaflet";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { DEFAULT_RADIUS_METERS } from "../../domain/map/distance";
import {
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import {
  renderEditCircleWithMarker,
  renderEditPointMarker,
  renderGeoJsonPolygonGroups,
} from "./renderHelpers";

interface GeometryEditLayerProps {
  annotation: AnnotationRecord;
  draftGeometry: Feature<Point | LineString | GeoPolygon | MultiPolygon>;
  gameArea: GameArea;
}

export const GeometryEditLayer = memo(function GeometryEditLayer({
  annotation,
  draftGeometry,
  gameArea,
}: GeometryEditLayerProps) {
  const tentaclePoint = useMemo(() => {
    if (annotation.type !== "tentacle") {
      return null;
    }

    return draftGeometry.geometry as Point;
  }, [annotation.type, draftGeometry.geometry]);

  const tentacleNoRadarDisk = useMemo(() => {
    if (!tentaclePoint || !annotation.metadata.tentacleOutOfReach) {
      return null;
    }

    return turfCircle(turfPoint(tentaclePoint.coordinates), 
      (annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS) / 1000,
      { steps: 64, units: "kilometers" },
    ) as Feature<GeoPolygon>;
  }, [annotation.metadata.radiusMeters, annotation.metadata.tentacleOutOfReach, tentaclePoint]);

  const tentacleYesRadarOutside = useMemo(() => {
    if (!tentaclePoint || annotation.metadata.tentacleOutOfReach) {
      return null;
    }

    const answerRadius =
      annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const radarCircle = turfCircle(
      turfPoint(tentaclePoint.coordinates),
      answerRadius / 1000,
      { steps: 64, units: "kilometers" },
    );

    return safeDifference(
      gameAreaToPolygon(gameArea),
      radarCircle as Feature<GeoPolygon>,
    );
  }, [
    annotation.metadata.radiusMeters,
    annotation.metadata.tentacleOutOfReach,
    gameArea,
    tentaclePoint,
  ]);

  if (annotation.type === "radar") {
    const point = draftGeometry.geometry as Point;
    const center: LatLngTuple = [point.coordinates[1], point.coordinates[0]];
    const radius = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;

    return renderEditCircleWithMarker({
      center,
      radiusMeters: radius,
      markerFillColor: MAP_ANNOTATION_COLORS.radar,
      circleOptions: {
        color: MAP_ANNOTATION_COLORS.radar,
        weight: 2,
        dashArray: "6 6",
        fillOpacity: 0.08,
      },
    });
  }

  if (annotation.type === "tentacle") {
    const point = draftGeometry.geometry as Point;
    const center: LatLngTuple = [point.coordinates[1], point.coordinates[0]];
    const searchRadius =
      annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const tentacleColor = annotation.metadata.color ?? MAP_ANNOTATION_COLORS.tentacle;

    if (annotation.metadata.tentacleOutOfReach) {
      return (
        <>
          {renderEditCircleWithMarker({
            center,
            radiusMeters: searchRadius,
            markerFillColor: tentacleColor,
            circleOptions: {
              color: tentacleColor,
              weight: 2,
              fillOpacity: 0.05,
            },
          })}
          {tentacleNoRadarDisk
            ? renderGeoJsonPolygonGroups({
                id: "tentacle-edit-no-radar",
                feature: tentacleNoRadarDisk,
                pathOptions: {
                  color: tentacleColor,
                  weight: 1,
                  fillColor: tentacleColor,
                  fillOpacity: 0.35,
                },
              })
            : null}
        </>
      );
    }

    return (
      <>
        {renderEditCircleWithMarker({
          center,
          radiusMeters: searchRadius,
          markerFillColor: tentacleColor,
          circleOptions: {
            color: tentacleColor,
            weight: 2,
            dashArray: "6 6",
            fillOpacity: 0.05,
          },
        })}
        {tentacleYesRadarOutside
          ? renderGeoJsonPolygonGroups({
              id: "tentacle-edit-yes-radar",
              feature: tentacleYesRadarOutside,
              pathOptions: {
                color: tentacleColor,
                weight: 1,
                fillColor: tentacleColor,
                fillOpacity: 0.35,
              },
            })
          : null}
      </>
    );
  }

  if (annotation.type === "pin") {
    const point = draftGeometry.geometry as Point;

    return renderEditPointMarker({
      center: [point.coordinates[1], point.coordinates[0]],
      fillColor: MAP_ANNOTATION_COLORS.pin,
    });
  }

  if (annotation.type === "thermometer") {
    const line = draftGeometry.geometry as LineString;
    const pointA: LatLngTuple = [
      line.coordinates[0][1],
      line.coordinates[0][0],
    ];
    const pointB: LatLngTuple = [
      line.coordinates[line.coordinates.length - 1][1],
      line.coordinates[line.coordinates.length - 1][0],
    ];

    return (
      <>
        <Polyline
          positions={[pointA, pointB]}
          pathOptions={{ color: MAP_ANNOTATION_COLORS.thermometerAxis, weight: 4, dashArray: "6 6" }}
        />
        {renderEditPointMarker({
          center: pointA,
          radius: 7,
          fillColor: MAP_ANNOTATION_COLORS.thermometerA,
        })}
        {renderEditPointMarker({
          center: pointB,
          radius: 7,
          fillColor: MAP_ANNOTATION_COLORS.thermometerB,
        })}
      </>
    );
  }

  if (annotation.type === "zone") {
    const polygon = draftGeometry.geometry as GeoPolygon;
    const ring = polygon.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as LatLngTuple,
    );

    return (
      <>
        <Polygon
          positions={ring}
          pathOptions={{
            color: MAP_ANNOTATION_COLORS.zoneDraft,
            weight: 2,
            dashArray: "6 6",
            fillOpacity: 0.12,
          }}
        />
        {ring.slice(0, -1).map((vertex, index) => (
          <CircleMarker
            key={`zone-edit-${index}`}
            center={vertex}
            radius={6}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.zoneDraft,
              fillColor: MAP_ANNOTATION_COLORS.zoneDraft,
              fillOpacity: 1,
            }}
          />
        ))}
      </>
    );
  }

  return null;
});
