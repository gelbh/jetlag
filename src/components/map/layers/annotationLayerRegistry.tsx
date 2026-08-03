/* eslint-disable react-refresh/only-export-components -- registry exports render helper alongside layer components */
import turfCircle from "@turf/circle";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../../domain/map/annotations";
import { pointToolRadiusFromMetadata } from "../../../domain/map/annotations";
import { polygonFeatureToRings } from "../../../domain/geometry/gameArea/geometry";
import type { LayerVisibility } from "../../../state/sessionStore";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { useCallback } from "react";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import { useMapFeatureHitTarget } from "../helpers/MapFeatureHitTestContext";
import { PinAnnotationMarker } from "./PinAnnotationMarker";

interface RenderAnnotationLayerItemParams {
  annotation: AnnotationRecord;
  gameArea: GameArea;
  layerVisibility?: LayerVisibility;
  selectedAnnotationId: string | null;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
}

function PointRadiusAnnotationLayer({
  annotationId,
  center,
  radiusMeters,
  selected,
  selectionEnabled,
  selectAnnotation,
  markerFillColor,
  strokeColor,
  fillColor,
  fillOpacity,
  dashArray,
}: {
  annotationId: string;
  center: [number, number];
  radiusMeters: number;
  selected: boolean;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
  markerFillColor: string;
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
}) {
  const [lat, lng] = center;
  const weight = selected ? 3 : 2;
  const feature = turfCircle([lng, lat], radiusMeters / 1000, {
    steps: 64,
    units: "kilometers",
  });

  useMapFeatureHitTarget(
    annotationId,
    useCallback(() => {
      if (!selectionEnabled) {
        return false;
      }
      selectAnnotation();
      return true;
    }, [selectAnnotation, selectionEnabled]),
    selectionEnabled,
  );

  return (
    <>
      <MapLibreGeoJsonOverlay
        id={`annotation-${annotationId}-radius`}
        data={feature}
        fill={{ fillColor, fillOpacity }}
        line={{
          color: strokeColor,
          width: weight,
          dashArray: cssPxDashToMapLibre(dashArray, weight),
        }}
      />
      <MapLibrePointMarkers
        id={`annotation-${annotationId}-center`}
        markers={[
          {
            id: `${annotationId}-center`,
            lat,
            lng,
            radiusPx: 6,
            fillColor: markerFillColor,
            borderColor: MAP_ANNOTATION_COLORS.strokeLight,
            hitId: annotationId,
            hitKind: "annotation-center",
          },
        ]}
        interactive={selectionEnabled}
      />
    </>
  );
}

export function renderAnnotationLayerItem({
  annotation,
  layerVisibility,
  selectedAnnotationId,
  selectionEnabled,
  selectAnnotation,
}: RenderAnnotationLayerItemParams) {
  if (layerVisibility && !layerVisibility[annotation.type]) {
    return null;
  }

  const color =
    annotation.metadata.color ??
    (annotation.type === "pin"
      ? MAP_ANNOTATION_COLORS.pin
      : MAP_ANNOTATION_COLORS.elimination);
  const selected = annotation.id === selectedAnnotationId;

  if (
    annotation.type === "radar" &&
    annotation.geometry.geometry.type === "Point" &&
    annotation.metadata.inside !== undefined
  ) {
    return null;
  }

  if (
    annotation.type === "radar" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    const radiusMeters = pointToolRadiusFromMetadata(annotation.metadata);
    return (
      <PointRadiusAnnotationLayer
        key={annotation.id}
        annotationId={annotation.id}
        center={[lat, lng]}
        radiusMeters={radiusMeters}
        selected={selected}
        selectionEnabled={selectionEnabled}
        selectAnnotation={selectAnnotation}
        markerFillColor={MAP_ANNOTATION_COLORS.radar}
        strokeColor={MAP_ANNOTATION_COLORS.radar}
        fillColor={MAP_ANNOTATION_COLORS.radar}
        fillOpacity={0.08}
      />
    );
  }

  if (
    annotation.type === "tentacle" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    const radiusMeters = pointToolRadiusFromMetadata(annotation.metadata);
    return (
      <PointRadiusAnnotationLayer
        key={annotation.id}
        annotationId={annotation.id}
        center={[lat, lng]}
        radiusMeters={radiusMeters}
        selected={selected}
        selectionEnabled={selectionEnabled}
        selectAnnotation={selectAnnotation}
        markerFillColor={MAP_ANNOTATION_COLORS.tentacle}
        strokeColor={MAP_ANNOTATION_COLORS.tentacleAccent}
        fillColor={MAP_ANNOTATION_COLORS.tentacle}
        fillOpacity={0.06}
        dashArray="6 6"
      />
    );
  }

  if (
    annotation.type === "matching" ||
    (annotation.type === "measuring" &&
      (annotation.geometry.geometry.type === "Polygon" ||
        annotation.geometry.geometry.type === "MultiPolygon")) ||
    (annotation.type === "thermometer" &&
      annotation.geometry.geometry.type === "LineString")
  ) {
    return null;
  }

  if (
    annotation.type === "zone" &&
    annotation.geometry.geometry.type === "Polygon"
  ) {
    const zonePolygon = annotation.geometry as Feature<GeoPolygon>;
    const weight = selected ? 4 : 2;
    return polygonFeatureToRings(zonePolygon).map((ring, index) => (
      <MapLibreGeoJsonOverlay
        key={`${annotation.id}-outline-${index}`}
        id={`annotation-${annotation.id}-zone-${index}`}
        data={{
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: ring.map(([lat, lng]) => [lng, lat]),
          },
        }}
        line={{
          color,
          width: weight,
        }}
      />
    ));
  }

  if (
    annotation.type === "pin" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    return (
      <PinAnnotationMarker
        key={annotation.id}
        annotationId={annotation.id}
        lat={lat}
        lng={lng}
        color={color}
        label={annotation.metadata.label ?? "Note"}
        selectionEnabled={selectionEnabled}
        onSelect={selectAnnotation}
      />
    );
  }

  return null;
}
