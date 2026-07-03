import { Fragment } from "react";
import { Circle, CircleMarker, Polyline, Popup } from "react-leaflet";
import type {
  Feature,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import { DEFAULT_RADIUS_METERS } from "../../domain/distance";
import {
  polygonFeatureToLeafletRings,
  type LatLngTuple,
} from "../../domain/geometry";
import type { LayerVisibility } from "../../state/sessionStore";

interface RenderAnnotationLayerItemParams {
  annotation: AnnotationRecord;
  gameArea: GameArea;
  layerVisibility?: LayerVisibility;
  selectedAnnotationId: string | null;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
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

  const color = annotation.metadata.color ?? "#f97316";
  const selected = annotation.id === selectedAnnotationId;

  // Committed question tools: elimination fill only (CombinedEliminationLayer).
  if (
    annotation.type === "matching" ||
    (annotation.type === "measuring" &&
      (annotation.geometry.geometry.type === "Polygon" ||
        annotation.geometry.geometry.type === "MultiPolygon")) ||
    (annotation.type === "thermometer" &&
      annotation.geometry.geometry.type === "LineString") ||
    (annotation.type === "tentacle" &&
      annotation.geometry.geometry.type === "Point")
  ) {
    return null;
  }

  if (annotation.type === "radar") {
    const center = annotation.geometry.geometry as Point;
    const radius = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const centerTuple: LatLngTuple = [
      center.coordinates[1],
      center.coordinates[0],
    ];

    return (
      <Fragment key={annotation.id}>
        <Circle
          center={centerTuple}
          radius={radius}
          interactive={selectionEnabled}
          pathOptions={{
            color,
            weight: selected ? 4 : 2,
            fillOpacity: 0.05,
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
      </Fragment>
    );
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
          color: "#ffffff",
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
