import { useMemo } from "react";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  formatThermometerWalkProgress,
  type DistanceUnit,
} from "../../../domain/map/distance";
import { distanceBetweenPoints } from "../../../domain/geometry/gameArea/geometry";
import { getBasemapSurface } from "../../../domain/map/mapBasemaps";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import {
  symbolMarkerCollection,
  type CircleMarkerProps,
  type SymbolMarkerProps,
} from "../helpers/mapMarkerFeatures";

interface ActiveThermometerWalkLayerProps {
  start: LatLngTuple | null;
  livePoint: LatLngTuple | null;
  targetDistanceMeters?: number | null;
  mapStyle?: "standard" | "satellite";
  distanceUnit?: DistanceUnit;
}

function labelTextColor(mapStyle: "standard" | "satellite"): string {
  const surface = getBasemapSurface(mapStyle, "light");
  return surface === "satellite" || surface === "dark"
    ? MAP_ANNOTATION_COLORS.strokeLight
    : MAP_ANNOTATION_COLORS.thermometerAxis;
}

export function ActiveThermometerWalkLayer({
  start,
  livePoint,
  targetDistanceMeters = null,
  mapStyle = "standard",
  distanceUnit = "imperial",
}: ActiveThermometerWalkLayerProps) {
  const model = useMemo(() => {
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
    const progress = formatThermometerWalkProgress(
      walkDistanceMeters,
      targetDistanceMeters,
      distanceUnit,
    );
    const textColor = labelTextColor(mapStyle);
    const progressText = progress.target
      ? `${progress.walked} / ${progress.target}`
      : progress.walked;

    return {
      start,
      livePoint,
      midpoint,
      axisColor,
      liveColor,
      textColor,
      progressText,
    };
  }, [distanceUnit, livePoint, mapStyle, start, targetDistanceMeters]);

  const dotMarkers = useMemo((): CircleMarkerProps[] => {
    if (!model) {
      return [];
    }
    return [
      {
        id: "thermo-walk-start",
        lat: model.start[0],
        lng: model.start[1],
        radiusPx: 7,
        borderColor: MAP_ANNOTATION_COLORS.strokeLight,
        fillColor: MAP_ANNOTATION_COLORS.thermometerA,
      },
      {
        id: "thermo-walk-live",
        lat: model.livePoint[0],
        lng: model.livePoint[1],
        radiusPx: 9,
        borderColor: MAP_ANNOTATION_COLORS.strokeLight,
        fillColor: model.liveColor,
      },
    ];
  }, [model]);

  const labelMarkers = useMemo((): SymbolMarkerProps[] => {
    if (!model) {
      return [];
    }
    return [
      {
        id: "thermo-walk-start-label",
        lat: model.start[0],
        lng: model.start[1],
        text: "Start",
        textOffset: [0, -1.2],
      },
      {
        id: "thermo-walk-live-label",
        lat: model.livePoint[0],
        lng: model.livePoint[1],
        text: "Live",
        textOffset: [0, -1.2],
      },
      {
        id: "thermo-walk-progress-label",
        lat: model.midpoint[0],
        lng: model.midpoint[1],
        text: model.progressText,
        textOffset: [0, -0.8],
      },
    ];
  }, [model]);

  if (!model) {
    return null;
  }

  const lineData = {
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates: [
        [model.start[1], model.start[0]],
        [model.livePoint[1], model.livePoint[0]],
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
      <MapLibrePointMarkers id="thermo-walk-dots" markers={dotMarkers} />
      <MapLibreGeoJsonOverlay
        id="thermo-walk-labels"
        data={symbolMarkerCollection(labelMarkers)}
        symbol={{
          layout: {
            textField: ["get", "text"],
            textSize: 12,
            textOffset: ["get", "textOffset"],
            textAnchor: "top",
            textAllowOverlap: true,
          },
          paint: {
            textColor: model.textColor,
            textHaloColor: MAP_ANNOTATION_COLORS.playAreaMask,
            textHaloWidth: 1.5,
          },
        }}
      />
    </>
  );
}
