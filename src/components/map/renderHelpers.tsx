import { Fragment, type ReactNode } from "react";
import { Circle, CircleMarker, Polygon } from "react-leaflet";
import type { PathOptions } from "leaflet";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import { polygonFeatureToLeafletPolygonGroups } from "../../domain/geometry/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

export interface PointRadiusAnnotationStyle {
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
}

export interface PointRadiusAnnotationParams {
  annotationId: string;
  center: [number, number];
  radiusMeters: number;
  selected: boolean;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
  markerFillColor: string;
  style: PointRadiusAnnotationStyle;
}

export function renderPointRadiusAnnotation({
  annotationId,
  center,
  radiusMeters,
  selected,
  selectionEnabled,
  selectAnnotation,
  markerFillColor,
  style,
}: PointRadiusAnnotationParams): ReactNode {
  const clickHandler = selectionEnabled
    ? {
        click: (event: { originalEvent?: Event }) => {
          event.originalEvent?.stopPropagation();
          selectAnnotation();
        },
      }
    : undefined;

  return (
    <Fragment key={annotationId}>
      <Circle
        center={center}
        radius={radiusMeters}
        interactive={selectionEnabled}
        pathOptions={{
          color: style.strokeColor,
          weight: selected ? 3 : 2,
          dashArray: style.dashArray,
          fillColor: style.fillColor,
          fillOpacity: style.fillOpacity,
        }}
        eventHandlers={clickHandler}
      />
      <CircleMarker
        center={center}
        radius={6}
        interactive={selectionEnabled}
        pathOptions={{
          color: MAP_ANNOTATION_COLORS.strokeLight,
          weight: 2,
          fillColor: markerFillColor,
          fillOpacity: 1,
        }}
        eventHandlers={clickHandler}
      />
    </Fragment>
  );
}

export interface GeoJsonPolygonRenderParams {
  id: string;
  feature: Feature<GeoPolygon | MultiPolygon>;
  pathOptions?: PathOptions;
}

export function renderGeoJsonPolygonGroups({
  id,
  feature,
  pathOptions,
}: GeoJsonPolygonRenderParams): ReactNode {
  const defaults: PathOptions = {
    color: MAP_ANNOTATION_COLORS.boundary,
    weight: 1,
    fillColor: MAP_ANNOTATION_COLORS.boundary,
    fillOpacity: 0.2,
  };

  return (
    <Fragment key={id}>
      {polygonFeatureToLeafletPolygonGroups(feature).map((rings, index) => (
        <Polygon
          key={`${id}-${index}`}
          positions={rings}
          pathOptions={{ ...defaults, ...pathOptions }}
        />
      ))}
    </Fragment>
  );
}

export function renderEditCircleWithMarker({
  center,
  radiusMeters,
  circleOptions,
  markerRadius = 8,
  markerFillColor,
}: {
  center: [number, number];
  radiusMeters: number;
  circleOptions: PathOptions;
  markerRadius?: number;
  markerFillColor: string;
}): ReactNode {
  return (
    <>
      <Circle center={center} radius={radiusMeters} pathOptions={circleOptions} />
      <CircleMarker
        center={center}
        radius={markerRadius}
        pathOptions={{
          color: MAP_ANNOTATION_COLORS.strokeLight,
          weight: 2,
          fillColor: markerFillColor,
          fillOpacity: 1,
        }}
      />
    </>
  );
}

export function renderEditPointMarker({
  center,
  radius = 8,
  fillColor,
  strokeColor = MAP_ANNOTATION_COLORS.strokeLight,
}: {
  center: [number, number];
  radius?: number;
  fillColor: string;
  strokeColor?: string;
}): ReactNode {
  return (
    <CircleMarker
      center={center}
      radius={radius}
      pathOptions={{
        color: strokeColor,
        weight: 2,
        fillColor,
        fillOpacity: 1,
      }}
    />
  );
}
