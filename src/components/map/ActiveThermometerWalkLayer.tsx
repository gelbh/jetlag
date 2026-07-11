import { CircleMarker, Polyline, Tooltip } from "react-leaflet";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";
import { formatDistance, type DistanceUnit } from "../../domain/map/distance";
import { distanceBetweenPoints } from "../../domain/geometry/geometry";

interface ActiveThermometerWalkLayerProps {
  start: LatLngTuple | null;
  livePoint: LatLngTuple | null;
  mapStyle?: "standard" | "satellite";
  distanceUnit?: DistanceUnit;
}

export function ActiveThermometerWalkLayer({
  start,
  livePoint,
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

  return (
    <>
      <Polyline
        positions={[start, livePoint]}
        pathOptions={{
          color: axisColor,
          weight: 5,
          dashArray: "10 8",
          opacity: 0.95,
          lineCap: "round",
        }}
      />
      <Polyline
        positions={[start, livePoint]}
        pathOptions={{
          color: liveColor,
          weight: 2,
          opacity: 0.55,
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
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
          Walk start
        </Tooltip>
      </CircleMarker>
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
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
          Live position
        </Tooltip>
      </CircleMarker>
      <CircleMarker
        center={midpoint}
        radius={0}
        pathOptions={{ opacity: 0, fillOpacity: 0, weight: 0 }}
      >
        <Tooltip direction="center" permanent opacity={0.95}>
          {formatDistance(walkDistanceMeters, distanceUnit)}
        </Tooltip>
      </CircleMarker>
    </>
  );
}
