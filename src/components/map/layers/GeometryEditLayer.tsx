import { memo, useMemo } from "react";
import turfCircle from "@turf/circle";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "@/domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  buildGeometryEditModel,
  type GeometryEditModel,
} from "../helpers/buildGeometryEditModel";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import type { CircleMarkerProps } from "../helpers/mapMarkerFeatures";

interface GeometryEditLayerProps {
  annotation: AnnotationRecord;
  draftGeometry: Feature<Point | LineString | GeoPolygon | MultiPolygon>;
  gameArea: GameArea;
}

function editCircleFeature(
  center: LatLngTuple,
  radiusMeters: number,
): Feature<GeoPolygon> {
  return turfCircle([center[1], center[0]], radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  }) as Feature<GeoPolygon>;
}

function editCenterMarker(
  id: string,
  center: LatLngTuple,
  fillColor: string,
): CircleMarkerProps {
  return {
    id,
    lat: center[0],
    lng: center[1],
    radiusPx: 8,
    fillColor,
    borderColor: MAP_ANNOTATION_COLORS.strokeLight,
  };
}

function MapLibreEditCircleWithMarker({
  id,
  center,
  radiusMeters,
  markerFillColor,
  color,
  weight = 2,
  dashArray,
  fillOpacity,
}: {
  id: string;
  center: LatLngTuple;
  radiusMeters: number;
  markerFillColor: string;
  color: string;
  weight?: number;
  dashArray?: string;
  fillOpacity: number;
}) {
  return (
    <>
      <MapLibreGeoJsonOverlay
        id={id}
        data={editCircleFeature(center, radiusMeters)}
        fill={{ fillColor: color, fillOpacity }}
        line={{
          color,
          width: weight,
          dashArray: cssPxDashToMapLibre(dashArray, weight),
        }}
      />
      <MapLibrePointMarkers
        id={`${id}-center`}
        markers={[editCenterMarker(`${id}-center`, center, markerFillColor)]}
      />
    </>
  );
}

function geometryEditMarkers(model: GeometryEditModel): CircleMarkerProps[] {
  switch (model.kind) {
    case "radar":
    case "tentacle":
      return [];
    case "pin":
      return [
        {
          id: "geometry-edit-pin",
          lat: model.latitude,
          lng: model.longitude,
          radiusPx: 8,
          fillColor: model.color,
          borderColor: MAP_ANNOTATION_COLORS.strokeLight,
        },
      ];
    case "thermometer":
      return [
        {
          id: "geometry-edit-thermo-a",
          lat: model.pointA[0],
          lng: model.pointA[1],
          radiusPx: 7,
          fillColor: model.colorA,
          borderColor: MAP_ANNOTATION_COLORS.strokeLight,
        },
        {
          id: "geometry-edit-thermo-b",
          lat: model.pointB[0],
          lng: model.pointB[1],
          radiusPx: 7,
          fillColor: model.colorB,
          borderColor: MAP_ANNOTATION_COLORS.strokeLight,
        },
      ];
    case "zone":
      return model.ringLatLng.slice(0, -1).map(([lat, lng], index) => ({
        id: `geometry-edit-zone-${index}`,
        lat,
        lng,
        radiusPx: 6,
        fillColor: model.color,
        borderColor: model.color,
      }));
    case "empty":
      return [];
    default: {
      const _exhaustive: never = model;
      void _exhaustive;
      return [];
    }
  }
}

function renderGeometryEditMapLibre(
  model: GeometryEditModel,
  markers: CircleMarkerProps[],
) {
  switch (model.kind) {
    case "radar":
      return (
        <MapLibreEditCircleWithMarker
          id="geometry-edit-radar"
          center={model.center}
          radiusMeters={model.radiusMeters}
          markerFillColor={model.color}
          color={model.color}
          dashArray="6 6"
          fillOpacity={0.08}
        />
      );
    case "tentacle":
      if (model.outOfReach) {
        return (
          <>
            <MapLibreEditCircleWithMarker
              id="geometry-edit-tentacle-search"
              center={model.center}
              radiusMeters={model.searchRadiusMeters}
              markerFillColor={model.color}
              color={model.color}
              fillOpacity={0.05}
            />
            {model.noRadarDisk ? (
              <MapLibreGeoJsonOverlay
                id="tentacle-edit-no-radar"
                data={model.noRadarDisk}
                fill={{ fillColor: model.color, fillOpacity: 0.35 }}
                line={{ color: model.color, width: 1 }}
              />
            ) : null}
          </>
        );
      }
      return (
        <>
          <MapLibreEditCircleWithMarker
            id="geometry-edit-tentacle-search"
            center={model.center}
            radiusMeters={model.searchRadiusMeters}
            markerFillColor={model.color}
            color={model.color}
            dashArray="6 6"
            fillOpacity={0.05}
          />
          {model.yesRadarOutside ? (
            <MapLibreGeoJsonOverlay
              id="tentacle-edit-yes-radar"
              data={model.yesRadarOutside}
              fill={{ fillColor: model.color, fillOpacity: 0.35 }}
              line={{ color: model.color, width: 1 }}
            />
          ) : null}
        </>
      );
    case "pin":
    case "thermometer":
      return (
        <>
          {model.kind === "thermometer" ? (
            <MapLibreGeoJsonOverlay
              id="geometry-edit-thermo-line"
              data={model.lineFeature}
              line={{
                color: model.axisColor,
                width: 4,
                dashArray: cssPxDashToMapLibre("6 6", 4),
              }}
            />
          ) : null}
          <MapLibrePointMarkers id="geometry-edit-handles" markers={markers} />
        </>
      );
    case "zone":
      return (
        <>
          <MapLibreGeoJsonOverlay
            id="geometry-edit-zone"
            data={model.polygonFeature}
            fill={{
              fillColor: model.color,
              fillOpacity: 0.12,
            }}
            line={{
              color: model.color,
              width: 2,
              dashArray: cssPxDashToMapLibre("6 6", 2),
            }}
          />
          <MapLibrePointMarkers id="geometry-edit-handles" markers={markers} />
        </>
      );
    case "empty":
      return null;
    default: {
      const _exhaustive: never = model;
      void _exhaustive;
      return null;
    }
  }
}

export const GeometryEditLayer = memo(function GeometryEditLayer({
  annotation,
  draftGeometry,
  gameArea,
}: GeometryEditLayerProps) {
  const model = useMemo(
    () => buildGeometryEditModel(annotation, draftGeometry, gameArea),
    [annotation, draftGeometry, gameArea],
  );

  const markers = useMemo(() => geometryEditMarkers(model), [model]);

  return renderGeometryEditMapLibre(model, markers);
});
