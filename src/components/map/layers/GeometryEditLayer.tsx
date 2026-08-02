import { memo, useMemo } from "react";
import turfCircle from "@turf/circle";
import type {
  Feature,
  LineString,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolygon } from "../helpers/CompensatedPolygon";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import {
  buildGeometryEditModel,
  type GeometryEditModel,
} from "../helpers/buildGeometryEditModel";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import {
  renderEditCircleWithMarker,
  renderEditPointMarker,
  renderGeoJsonPolygonGroups,
} from "../helpers/renderHelpers";
import { matchMapEngine } from "../chrome/matchMapEngine";
import { useMapEngine } from "../chrome/mapEngineContext";

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
      <MapLibreDotMarker
        latitude={center[0]}
        longitude={center[1]}
        radiusPx={8}
        fillColor={markerFillColor}
        borderColor={MAP_ANNOTATION_COLORS.strokeLight}
      />
    </>
  );
}

function renderGeometryEditMapLibre(model: GeometryEditModel) {
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
      return (
        <MapLibreDotMarker
          latitude={model.latitude}
          longitude={model.longitude}
          radiusPx={8}
          fillColor={model.color}
          borderColor={MAP_ANNOTATION_COLORS.strokeLight}
        />
      );
    case "thermometer":
      return (
        <>
          <MapLibreGeoJsonOverlay
            id="geometry-edit-thermo-line"
            data={model.lineFeature}
            line={{
              color: model.axisColor,
              width: 4,
              dashArray: cssPxDashToMapLibre("6 6", 4),
            }}
          />
          <MapLibreDotMarker
            latitude={model.pointA[0]}
            longitude={model.pointA[1]}
            radiusPx={7}
            fillColor={model.colorA}
            borderColor={MAP_ANNOTATION_COLORS.strokeLight}
          />
          <MapLibreDotMarker
            latitude={model.pointB[0]}
            longitude={model.pointB[1]}
            radiusPx={7}
            fillColor={model.colorB}
            borderColor={MAP_ANNOTATION_COLORS.strokeLight}
          />
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
          {model.ringLatLng.slice(0, -1).map(([lat, lng], index) => (
            <MapLibreDotMarker
              key={`zone-edit-${index}`}
              latitude={lat}
              longitude={lng}
              radiusPx={6}
              fillColor={model.color}
              borderColor={model.color}
            />
          ))}
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

function renderGeometryEditLeaflet(model: GeometryEditModel) {
  switch (model.kind) {
    case "radar":
      return renderEditCircleWithMarker({
        center: model.center,
        radiusMeters: model.radiusMeters,
        markerFillColor: model.color,
        circleOptions: {
          color: model.color,
          weight: 2,
          dashArray: "6 6",
          fillOpacity: 0.08,
        },
      });
    case "tentacle":
      if (model.outOfReach) {
        return (
          <>
            {renderEditCircleWithMarker({
              center: model.center,
              radiusMeters: model.searchRadiusMeters,
              markerFillColor: model.color,
              circleOptions: {
                color: model.color,
                weight: 2,
                fillOpacity: 0.05,
              },
            })}
            {model.noRadarDisk
              ? renderGeoJsonPolygonGroups({
                  id: "tentacle-edit-no-radar",
                  feature: model.noRadarDisk,
                  pathOptions: {
                    color: model.color,
                    weight: 1,
                    fillColor: model.color,
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
            center: model.center,
            radiusMeters: model.searchRadiusMeters,
            markerFillColor: model.color,
            circleOptions: {
              color: model.color,
              weight: 2,
              dashArray: "6 6",
              fillOpacity: 0.05,
            },
          })}
          {model.yesRadarOutside
            ? renderGeoJsonPolygonGroups({
                id: "tentacle-edit-yes-radar",
                feature: model.yesRadarOutside,
                pathOptions: {
                  color: model.color,
                  weight: 1,
                  fillColor: model.color,
                  fillOpacity: 0.35,
                },
              })
            : null}
        </>
      );
    case "pin":
      return renderEditPointMarker({
        center: [model.latitude, model.longitude],
        fillColor: model.color,
      });
    case "thermometer":
      return (
        <>
          <CompensatedPolyline
            positions={[model.pointA, model.pointB]}
            pathOptions={{
              color: model.axisColor,
              weight: 4,
              dashArray: "6 6",
            }}
          />
          {renderEditPointMarker({
            center: model.pointA,
            radius: 7,
            fillColor: model.colorA,
          })}
          {renderEditPointMarker({
            center: model.pointB,
            radius: 7,
            fillColor: model.colorB,
          })}
        </>
      );
    case "zone":
      return (
        <>
          <CompensatedPolygon
            positions={model.ringLatLng}
            pathOptions={{
              color: model.color,
              weight: 2,
              dashArray: "6 6",
              fillOpacity: 0.12,
            }}
          />
          {model.ringLatLng.slice(0, -1).map((vertex, index) => (
            <CompensatedCircleMarker
              key={`zone-edit-${index}`}
              center={vertex}
              radius={6}
              pathOptions={{
                color: model.color,
                fillColor: model.color,
                fillOpacity: 1,
              }}
            />
          ))}
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
  const engine = useMapEngine();
  const model = useMemo(
    () => buildGeometryEditModel(annotation, draftGeometry, gameArea),
    [annotation, draftGeometry, gameArea],
  );

  return matchMapEngine(engine, {
    maplibre: () => renderGeometryEditMapLibre(model),
    leaflet: () => renderGeometryEditLeaflet(model),
  });
});
