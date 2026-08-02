import L from "leaflet";
import { Marker } from "react-leaflet";
import { Marker as MapLibreMarker } from "react-map-gl/maplibre";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  formatThermometerWalkProgress,
  type DistanceUnit,
} from "../../../domain/map/distance";
import { distanceBetweenPoints } from "../../../domain/geometry/gameArea/geometry";
import { matchMapEngine } from "../chrome/matchMapEngine";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import {
  thermometerWalkEndLabelMarkup,
  thermometerWalkProgressMarkup,
  type MapHtmlMarkup,
} from "../icons/thermometerWalkMarkup";

interface ActiveThermometerWalkLayerProps {
  start: LatLngTuple | null;
  livePoint: LatLngTuple | null;
  targetDistanceMeters?: number | null;
  mapStyle?: "standard" | "satellite";
  distanceUnit?: DistanceUnit;
}

interface ThermometerWalkModel {
  midpoint: LatLngTuple;
  axisColor: string;
  liveColor: string;
  startLabel: MapHtmlMarkup;
  liveLabel: MapHtmlMarkup;
  progressLabel: MapHtmlMarkup;
}

function buildThermometerWalkModel(
  start: LatLngTuple,
  livePoint: LatLngTuple,
  targetDistanceMeters: number | null,
  mapStyle: "standard" | "satellite",
  distanceUnit: DistanceUnit,
): ThermometerWalkModel {
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
  const progress = formatThermometerWalkProgress(
    walkDistanceMeters,
    targetDistanceMeters,
    distanceUnit,
  );

  return {
    midpoint,
    axisColor,
    liveColor,
    startLabel: thermometerWalkEndLabelMarkup("Start", mapStyle),
    liveLabel: thermometerWalkEndLabelMarkup("Live", mapStyle),
    progressLabel: thermometerWalkProgressMarkup(
      progress.walked,
      progress.target,
      mapStyle,
    ),
  };
}

function labelDivIcon(markup: MapHtmlMarkup, iconAnchor: [number, number]) {
  return L.divIcon({
    className: markup.className,
    html: markup.html,
    iconSize: [0, 0],
    iconAnchor,
  });
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

  const model = buildThermometerWalkModel(
    start,
    livePoint,
    targetDistanceMeters,
    mapStyle,
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

  return (
    <>
      <MapLibreGeoJsonOverlay
        id="thermo-walk-axis"
        data={lineData}
        layers={[
          {
            id: "thermo-walk-axis-dash",
            line: {
              color: model.axisColor,
              width: 4,
              opacity: 0.92,
              dashArray: cssPxDashToMapLibre("12 8", 4),
            },
          },
          {
            id: "thermo-walk-axis-core",
            line: {
              color: model.liveColor,
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
        style={{ zIndex: 400, pointerEvents: "none" }}
      >
        <div
          className={model.startLabel.className}
          dangerouslySetInnerHTML={{ __html: model.startLabel.html }}
        />
      </MapLibreMarker>
      <MapLibreDotMarker
        latitude={livePoint[0]}
        longitude={livePoint[1]}
        radiusPx={9}
        borderColor={MAP_ANNOTATION_COLORS.strokeLight}
        fillColor={model.liveColor}
        className="jl-thermometer-live-marker"
        zIndex={401}
      />
      <MapLibreMarker
        latitude={livePoint[0]}
        longitude={livePoint[1]}
        anchor="bottom"
        offset={[0, -8]}
        style={{ zIndex: 401, pointerEvents: "none" }}
      >
        <div
          className={model.liveLabel.className}
          dangerouslySetInnerHTML={{ __html: model.liveLabel.html }}
        />
      </MapLibreMarker>
      <MapLibreMarker
        latitude={model.midpoint[0]}
        longitude={model.midpoint[1]}
        anchor="bottom"
        offset={[0, -4]}
        style={{ zIndex: 402, pointerEvents: "none" }}
      >
        <div
          className={model.progressLabel.className}
          dangerouslySetInnerHTML={{ __html: model.progressLabel.html }}
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

  const model = buildThermometerWalkModel(
    start,
    livePoint,
    targetDistanceMeters,
    mapStyle,
    distanceUnit,
  );

  return (
    <>
      <CompensatedPolyline
        positions={[start, livePoint]}
        pathOptions={{
          color: model.axisColor,
          weight: 4,
          dashArray: "12 8",
          opacity: 0.92,
          lineCap: "round",
        }}
      />
      <CompensatedPolyline
        positions={[start, livePoint]}
        pathOptions={{
          color: model.liveColor,
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
        icon={labelDivIcon(model.startLabel, [0, 28])}
        zIndexOffset={400}
      />
      <CompensatedCircleMarker
        center={livePoint}
        radius={9}
        pathOptions={{
          color: MAP_ANNOTATION_COLORS.strokeLight,
          weight: 2,
          fillColor: model.liveColor,
          fillOpacity: 1,
          className: "jl-thermometer-live-marker",
        }}
      />
      <Marker
        position={livePoint}
        icon={labelDivIcon(model.liveLabel, [0, 28])}
        zIndexOffset={401}
      />
      <Marker
        position={model.midpoint}
        icon={labelDivIcon(model.progressLabel, [0, 14])}
        zIndexOffset={402}
      />
    </>
  );
}

export function ActiveThermometerWalkLayer(
  props: ActiveThermometerWalkLayerProps,
) {
  const engine = useMapEngine();
  return matchMapEngine(engine, {
    maplibre: () => <ActiveThermometerWalkLayerMapLibre {...props} />,
    leaflet: () => <ActiveThermometerWalkLayerLeaflet {...props} />,
  });
}
