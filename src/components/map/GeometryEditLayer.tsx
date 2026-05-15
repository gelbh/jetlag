import { Circle, CircleMarker, Polygon, Polyline } from "react-leaflet";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import { DEFAULT_RADIUS_METERS } from "../../domain/distance";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
} from "../../domain/tentacleQuestions";
import {
  gameAreaToPolygon,
  polygonFeatureToLeafletPolygonGroups,
  safeDifference,
  type LatLngTuple,
} from "../../domain/geometry";

interface GeometryEditLayerProps {
  annotation: AnnotationRecord;
  draftGeometry: Feature<Point | LineString | GeoPolygon | MultiPolygon>;
  gameArea: GameArea;
}

export function GeometryEditLayer({
  annotation,
  draftGeometry,
  gameArea,
}: GeometryEditLayerProps) {
  if (annotation.type === "radar") {
    const point = draftGeometry.geometry as Point;
    const center: LatLngTuple = [point.coordinates[1], point.coordinates[0]];
    const radius = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;

    return (
      <>
        <Circle
          center={center}
          radius={radius}
          pathOptions={{
            color: "#38bdf8",
            weight: 2,
            dashArray: "6 6",
            fillOpacity: 0.08,
          }}
        />
        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#38bdf8",
            fillOpacity: 1,
          }}
        />
      </>
    );
  }

  if (annotation.type === "tentacle") {
    const point = draftGeometry.geometry as Point;
    const center: LatLngTuple = [point.coordinates[1], point.coordinates[0]];
    const searchRadius =
      annotation.metadata.radiusMeters ?? TENTACLE_SEARCH_RADIUS_METERS;
    const answerRadius =
      annotation.metadata.tentacleAnswerRadiusMeters ??
      TENTACLE_ANSWER_RADIUS_METERS;
    const tentacleColor = annotation.metadata.color ?? "#22c55e";

    if (annotation.metadata.tentacleOutOfReach) {
      const noRadarDisk = turfCircle(
        turfPoint(point.coordinates),
        searchRadius / 1000,
        { steps: 64, units: "kilometers" },
      );

      return (
        <>
          <Circle
            center={center}
            radius={searchRadius}
            pathOptions={{
              color: tentacleColor,
              weight: 2,
              fillOpacity: 0.05,
            }}
          />
          <CircleMarker
            center={center}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: tentacleColor,
              fillOpacity: 1,
            }}
          />
          {polygonFeatureToLeafletPolygonGroups(
            noRadarDisk as Feature<GeoPolygon>,
          ).map((rings, index) => (
            <Polygon
              key={`tentacle-edit-no-radar-${index}`}
              positions={rings}
              pathOptions={{
                color: tentacleColor,
                weight: 1,
                fillColor: tentacleColor,
                fillOpacity: 0.35,
              }}
            />
          ))}
        </>
      );
    }

    const radarCircle = turfCircle(
      turfPoint(point.coordinates),
      answerRadius / 1000,
      { steps: 64, units: "kilometers" },
    );
    const yesRadarOutside = safeDifference(
      gameAreaToPolygon(gameArea),
      radarCircle as Feature<GeoPolygon>,
    );

    return (
      <>
        <Circle
          center={center}
          radius={answerRadius}
          pathOptions={{
            color: tentacleColor,
            weight: 2,
            fillOpacity: 0.05,
          }}
        />
        {yesRadarOutside
          ? polygonFeatureToLeafletPolygonGroups(yesRadarOutside).map(
              (rings, index) => (
                <Polygon
                  key={`tentacle-edit-yes-radar-${index}`}
                  positions={rings}
                  pathOptions={{
                    color: tentacleColor,
                    weight: 1,
                    fillColor: tentacleColor,
                    fillOpacity: 0.35,
                  }}
                />
              ),
            )
          : null}
        <CircleMarker
          center={center}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: tentacleColor,
            fillOpacity: 1,
          }}
        />
      </>
    );
  }

  if (annotation.type === "pin") {
    const point = draftGeometry.geometry as Point;

    return (
      <CircleMarker
        center={[point.coordinates[1], point.coordinates[0]]}
        radius={8}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: "#38bdf8",
          fillOpacity: 1,
        }}
      />
    );
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
          pathOptions={{ color: "#f87171", weight: 4, dashArray: "6 6" }}
        />
        <CircleMarker
          center={pointA}
          radius={7}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: "#f87171",
            fillOpacity: 1,
          }}
        />
        <CircleMarker
          center={pointB}
          radius={7}
          pathOptions={{
            color: "#fff",
            weight: 2,
            fillColor: "#fb923c",
            fillOpacity: 1,
          }}
        />
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
            color: "#c084fc",
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
              color: "#c084fc",
              fillColor: "#c084fc",
              fillOpacity: 1,
            }}
          />
        ))}
      </>
    );
  }

  return null;
}
