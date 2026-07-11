import { Fragment } from "react";
import { Circle, CircleMarker, Polyline, Popup } from "react-leaflet";
import type { Feature, Polygon as GeoPolygon } from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/map/annotations";
import { DEFAULT_RADIUS_METERS } from "../../domain/map/distance";
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
    const radiusMeters =
      annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const radarColor = MAP_ANNOTATION_COLORS.radar;
    const clickHandler = selectionEnabled
      ? {
          click: (event: { originalEvent?: Event }) => {
            event.originalEvent?.stopPropagation();
            selectAnnotation();
          },
        }
      : undefined;

    return (
      <Fragment key={annotation.id}>
        <Circle
          center={[lat, lng]}
          radius={radiusMeters}
          interactive={selectionEnabled}
          pathOptions={{
            color: radarColor,
            weight: selected ? 3 : 2,
            fillColor: radarColor,
            fillOpacity: 0.08,
          }}
          eventHandlers={clickHandler}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={6}
          interactive={selectionEnabled}
          pathOptions={{
            color: MAP_ANNOTATION_COLORS.strokeLight,
            weight: 2,
            fillColor: radarColor,
            fillOpacity: 1,
          }}
          eventHandlers={clickHandler}
        />
      </Fragment>
    );
  }

  if (
    annotation.type === "tentacle" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    const radiusMeters =
      annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const tentacleColor = MAP_ANNOTATION_COLORS.tentacle;
    const tentacleAccent = MAP_ANNOTATION_COLORS.tentacleAccent;
    const clickHandler = selectionEnabled
      ? {
          click: (event: { originalEvent?: Event }) => {
            event.originalEvent?.stopPropagation();
            selectAnnotation();
          },
        }
      : undefined;

    return (
      <Fragment key={annotation.id}>
        <Circle
          center={[lat, lng]}
          radius={radiusMeters}
          interactive={selectionEnabled}
          pathOptions={{
            color: tentacleAccent,
            weight: selected ? 3 : 2,
            dashArray: "6 6",
            fillColor: tentacleColor,
            fillOpacity: 0.06,
          }}
          eventHandlers={clickHandler}
        />
        <CircleMarker
          center={[lat, lng]}
          radius={6}
          interactive={selectionEnabled}
          pathOptions={{
            color: MAP_ANNOTATION_COLORS.strokeLight,
            weight: 2,
            fillColor: tentacleColor,
            fillOpacity: 1,
          }}
          eventHandlers={clickHandler}
        />
      </Fragment>
    );
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
