import { Fragment } from "react";
import { Circle, CircleMarker, Polyline, Popup } from "react-leaflet";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { pointToolRadiusFromMetadata } from "../../domain/map/annotations";
import { polygonFeatureToLeafletRings } from "../../domain/geometry/geometry";
import type { LayerVisibility } from "../../state/sessionStore";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface RenderAnnotationLayerItemParams {
  annotation: AnnotationRecord;
  gameArea: GameArea;
  layerVisibility?: LayerVisibility;
  selectedAnnotationId: string | null;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
}

interface PointRadiusAnnotationStyle {
  strokeColor: string;
  fillColor: string;
  fillOpacity: number;
  dashArray?: string;
}

function renderPointRadiusAnnotation(params: {
  annotationId: string;
  center: [number, number];
  radiusMeters: number;
  selected: boolean;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
  markerFillColor: string;
  style: PointRadiusAnnotationStyle;
}) {
  const {
    annotationId,
    center,
    radiusMeters,
    selected,
    selectionEnabled,
    selectAnnotation,
    markerFillColor,
    style,
  } = params;

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
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    const radiusMeters = pointToolRadiusFromMetadata(annotation.metadata);
    const radarColor = MAP_ANNOTATION_COLORS.radar;

    return renderPointRadiusAnnotation({
      annotationId: annotation.id,
      center: [lat, lng],
      radiusMeters,
      selected,
      selectionEnabled,
      selectAnnotation,
      markerFillColor: radarColor,
      style: {
        strokeColor: radarColor,
        fillColor: radarColor,
        fillOpacity: 0.08,
      },
    });
  }

  if (
    annotation.type === "tentacle" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    const radiusMeters = pointToolRadiusFromMetadata(annotation.metadata);
    const tentacleColor = MAP_ANNOTATION_COLORS.tentacle;
    const tentacleAccent = MAP_ANNOTATION_COLORS.tentacleAccent;

    return renderPointRadiusAnnotation({
      annotationId: annotation.id,
      center: [lat, lng],
      radiusMeters,
      selected,
      selectionEnabled,
      selectAnnotation,
      markerFillColor: tentacleColor,
      style: {
        strokeColor: tentacleAccent,
        fillColor: tentacleColor,
        fillOpacity: 0.06,
        dashArray: "6 6",
      },
    });
  }

  // Committed question tools: elimination fill only (CombinedEliminationLayer).
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
    return polygonFeatureToLeafletRings(zonePolygon).map((ring, index) => (
      <Polyline
        key={`${annotation.id}-outline-${index}`}
        positions={ring}
        interactive={selectionEnabled}
        pathOptions={{
          color,
          weight: selected ? 4 : 2,
          fillOpacity: 0,
        }}
        eventHandlers={
          selectionEnabled
            ? {
                click: (event) => {
                  event.originalEvent?.stopPropagation();
                  selectAnnotation();
                },
              }
            : undefined
        }
      />
    ));
  }

  if (
    annotation.type === "pin" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    return (
      <CircleMarker
        key={annotation.id}
        center={[lat, lng]}
        radius={8}
        interactive={selectionEnabled}
        pathOptions={{
          color: MAP_ANNOTATION_COLORS.strokeLight,
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }}
        eventHandlers={
          selectionEnabled
            ? {
                click: (event) => {
                  event.originalEvent?.stopPropagation();
                  selectAnnotation();
                },
              }
            : undefined
        }
      >
        <Popup>{annotation.metadata.label ?? "Note"}</Popup>
      </CircleMarker>
    );
  }

  return null;
}
