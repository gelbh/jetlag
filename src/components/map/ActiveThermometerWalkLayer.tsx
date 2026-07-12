import { CircleMarker, Marker, Polyline } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import {
  formatThermometerWalkProgress,
  type DistanceUnit,
} from "../../domain/map/distance";
import { distanceBetweenPoints } from "../../domain/geometry/geometry";
import {
  createThermometerWalkEndLabelIcon,
  createThermometerWalkProgressIcon,
} from "./mapIcons";

interface ActiveThermometerWalkLayerProps {
  start: LatLngTuple | null;
  livePoint: LatLngTuple | null;
  targetDistanceMeters?: number | null;
  mapStyle?: "standard" | "satellite";
  distanceUnit?: DistanceUnit;
}

export function ActiveThermometerWalkLayer({
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
      <Polyline
        positions={[start, livePoint]}
        pathOptions={{
          color: axisColor,
          weight: 4,
          dashArray: "12 8",
          opacity: 0.92,
          lineCap: "round",
        }}
      />
      <Polyline
        positions={[start, livePoint]}
        pathOptions={{
          color: liveColor,
          weight: 2,
          opacity: 0.5,
          lineCap: "round",
        }}
      />
      <CircleMarker
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
      <CircleMarker
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
