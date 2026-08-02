import { Marker } from "react-leaflet";
import { Marker as MapLibreMarker } from "react-map-gl/maplibre";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  formatThermometerWalkProgress,
  type DistanceUnit,
} from "../../../domain/map/distance";
import { distanceBetweenPoints } from "../../../domain/geometry/gameArea/geometry";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreDotMarker } from "../helpers/MapLibreHtmlMarker";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import {
  createThermometerWalkEndLabelIcon,
  createThermometerWalkProgressIcon,
} from "../icons/mapIcons";

interface ActiveThermometerWalkLayerProps {
  start: LatLngTuple | null;
  livePoint: LatLngTuple | null;
  targetDistanceMeters?: number | null;
  mapStyle?: "standard" | "satellite";
  distanceUnit?: DistanceUnit;
}

function ActiveThermometerWalkLayerMapLibre({
  start,
  livePoint,
  targetDistanceMeters = null,
  mapStyle = "standard",
  distanceUnit = "imperial",
}: ActiveThermometerWalkLayerProps) {
  if (!start || !livePoint) {
    return null;
  }

  const walkDistanceMeters = distanceBetweenPoints(start, livePoint);
  const midpoint: LatLngTuple = [
    (start[0] + livePoint[0]) / 2,
    (start[1] + livePoint[1]) / 2,
  ];
  const axisColor =
    mapStyle === "satellite"
      ? MAP_ANNOTATION_COLORS.strokeLight
      : MAP_ANNOTATION_COLORS.thermometerAxis;
  const liveColor =
    mapStyle === "satellite"
      ? MAP_ANNOTATION_COLORS.highlight
      : MAP_ANNOTATION_COLORS.thermometerB;
  const progressLabel = formatThermometerWalkProgress(
    walkDistanceMeters,
    targetDistanceMeters,
    distanceUnit,
  );

  const lineData = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [start[1], start[0]],
        [livePoint[1], livePoint[0]],
      ],
    },
  };

  const startLabel = createThermometerWalkEndLabelIcon("Start", mapStyle);
  const liveLabel = createThermometerWalkEndLabelIcon("Live", mapStyle);
  const progressIcon = createThermometerWalkProgressIcon(
    progressLabel.walked,
    progressLabel.target,
    mapStyle,
  );

  return (
    <>
      <MapLibreGeoJsonOverlay
        id="thermo-walk-axis"
        data={lineData}
        layers={[
          {
            id: "thermo-walk-axis-dash",
            line: {
              color: axisColor,
              width: 4,
              opacity: 0.92,
              dashArray: cssPxDashToMapLibre("12 8", 4),
            },
          },
          {
            id: "thermo-walk-axis-core",
            line: {
              color: liveColor,
              width: 2,
              opacity: 0.5,
            },
          },
        ]}
      />
      <MapLibreDotMarker
        latitude={start[0]}
        longitude={start[1]}
        radiusPx={7}
        borderColor={MAP_ANNOTATION_COLORS.strokeLight}
        fillColor={MAP_ANNOTATION_COLORS.thermometerA}
        zIndex={400}
      />
      <MapLibreMarker
        latitude={start[0]}
        longitude={start[1]}
        anchor="bottom"
        offset={[0, -8]}
        style={{ zIndex: 400 }}
      >
        <div
          className={startLabel.options.className}
          dangerouslySetInnerHTML={{
            __html:
              typeof startLabel.options.html === "string"
                ? startLabel.options.html
                : "",
          }}
        />
      </MapLibreMarker>
      <MapLibreDotMarker
        latitude={livePoint[0]}
        longitude={livePoint[1]}
        radiusPx={9}
        borderColor={MAP_ANNOTATION_COLORS.strokeLight}
        fillColor={liveColor}
        className="jl-thermometer-live-marker"
        zIndex={401}
      />
      <MapLibreMarker
        latitude={livePoint[0]}
        longitude={livePoint[1]}
        anchor="bottom"
        offset={[0, -8]}
        style={{ zIndex: 401 }}
      >
        <div
          className={liveLabel.options.className}
          dangerouslySetInnerHTML={{
            __html:
              typeof liveLabel.options.html === "string"
                ? liveLabel.options.html
                : "",
          }}
        />
      </MapLibreMarker>
      <MapLibreMarker
        latitude={midpoint[0]}
        longitude={midpoint[1]}
        anchor="bottom"
        offset={[0, -4]}
        style={{ zIndex: 402 }}
      >
        <div
          className={progressIcon.options.className}
          dangerouslySetInnerHTML={{
            __html:
              typeof progressIcon.options.html === "string"
                ? progressIcon.options.html
                : "",
          }}
        />
      </MapLibreMarker>
    </>
  );
}

function ActiveThermometerWalkLayerLeaflet({
  start,
  livePoint,
  targetDistanceMeters = null,
  mapStyle = "standard",
  distanceUnit = "imperial",
}: ActiveThermometerWalkLayerProps) {
  if (!start || !livePoint) {
    return null;
  }

  const walkDistanceMeters = distanceBetweenPoints(start, livePoint);
  const midpoint: LatLngTuple = [
    (start[0] + livePoint[0]) / 2,
    (start[1] + livePoint[1]) / 2,
  ];
  const axisColor =
    mapStyle === "satellite"
      ? MAP_ANNOTATION_COLORS.strokeLight
      : MAP_ANNOTATION_COLORS.thermometerAxis;
  const liveColor =
    mapStyle === "satellite"
      ? MAP_ANNOTATION_COLORS.highlight
      : MAP_ANNOTATION_COLORS.thermometerB;
  const progressLabel = formatThermometerWalkProgress(
    walkDistanceMeters,
    targetDistanceMeters,
    distanceUnit,
  );

  return (
    <>
      <CompensatedPolyline
        positions={[start, livePoint]}
        pathOptions={{
          color: axisColor,
          weight: 4,
          dashArray: "12 8",
          opacity: 0.92,
          lineCap: "round",
        }}
      />
      <CompensatedPolyline
        positions={[start, livePoint]}
        pathOptions={{
          color: liveColor,
          weight: 2,
          opacity: 0.5,
          lineCap: "round",
        }}
      />
      <CompensatedCircleMarker
        center={start}
        radius={7}
        pathOptions={{
          color: MAP_ANNOTATION_COLORS.strokeLight,
          weight: 2,
          fillColor: MAP_ANNOTATION_COLORS.thermometerA,
          fillOpacity: 1,
        }}
      />
      <Marker
        position={start}
        icon={createThermometerWalkEndLabelIcon("Start", mapStyle)}
        zIndexOffset={400}
      />
      <CompensatedCircleMarker
        center={livePoint}
        radius={9}
        pathOptions={{
          color: MAP_ANNOTATION_COLORS.strokeLight,
          weight: 2,
          fillColor: liveColor,
          fillOpacity: 1,
          className: "jl-thermometer-live-marker",
        }}
      />
      <Marker
        position={livePoint}
        icon={createThermometerWalkEndLabelIcon("Live", mapStyle)}
        zIndexOffset={401}
      />
      <Marker
        position={midpoint}
        icon={createThermometerWalkProgressIcon(
          progressLabel.walked,
          progressLabel.target,
          mapStyle,
        )}
        zIndexOffset={402}
      />
    </>
  );
}

export function ActiveThermometerWalkLayer(
  props: ActiveThermometerWalkLayerProps,
) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <ActiveThermometerWalkLayerMapLibre {...props} />;
  }
  return <ActiveThermometerWalkLayerLeaflet {...props} />;
}
