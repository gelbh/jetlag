import turfCircle from "@turf/circle";
import type { Feature, LineString } from "geojson";
import { useMemo } from "react";
import { GameAreaMask } from "./GameAreaMask";
import type { GameArea } from "@/domain/map/annotations";
import type { FramingMode } from "@/hooks/session/useGameAreaFraming";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { MapLibrePointMarkers } from "../helpers/MapLibrePointMarkers";
import type { CircleMarkerProps } from "../helpers/mapMarkerFeatures";

interface FramingPreviewLayersProps {
  gameArea: GameArea | null;
  framingMode: FramingMode;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
}

const PREVIEW_STROKE = 3;
const CIRCLE_DASH = "8 6";
const POLYGON_DASH = "6 6";

export function FramingPreviewLayers({
  gameArea,
  framingMode,
  circleCenter,
  circleRadiusMeters,
  polygonVertices,
}: FramingPreviewLayersProps) {
  const circleMarker = useMemo((): CircleMarkerProps[] => {
    if (!circleCenter) {
      return [];
    }
    return [
      {
        id: "framing-circle-center",
        lat: circleCenter[0],
        lng: circleCenter[1],
        radiusPx: 8,
        fillColor: MAP_ANNOTATION_COLORS.playArea,
        borderColor: MAP_ANNOTATION_COLORS.strokeLight,
      },
    ];
  }, [circleCenter]);

  const vertexMarkers = useMemo((): CircleMarkerProps[] => {
    return polygonVertices.map(([lat, lng], index) => ({
      id: `framing-vertex-${index}`,
      lat,
      lng,
      radiusPx: 6,
      fillColor: MAP_ANNOTATION_COLORS.playArea,
      borderColor: MAP_ANNOTATION_COLORS.strokeLight,
    }));
  }, [polygonVertices]);

  return (
    <>
      {gameArea ? <GameAreaMask gameArea={gameArea} framing /> : null}

      {framingMode === "circle" && circleCenter && circleRadiusMeters ? (
        <>
          <MapLibreGeoJsonOverlay
            id="framing-preview-circle"
            data={turfCircle(
              [circleCenter[1], circleCenter[0]],
              circleRadiusMeters / 1000,
              { steps: 64, units: "kilometers" },
            )}
            fill={{
              fillColor: MAP_ANNOTATION_COLORS.playArea,
              fillOpacity: 0.08,
            }}
            line={{
              color: MAP_ANNOTATION_COLORS.playArea,
              width: PREVIEW_STROKE,
              dashArray: cssPxDashToMapLibre(CIRCLE_DASH, PREVIEW_STROKE),
            }}
          />
          <MapLibrePointMarkers
            id="framing-circle-center"
            markers={circleMarker}
          />
        </>
      ) : null}

      {framingMode === "polygon" && polygonVertices.length > 0 ? (
        <>
          <MapLibreGeoJsonOverlay
            id="framing-preview-polygon"
            data={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: polygonVertices.map(([lat, lng]) => [lng, lat]),
              },
            } as Feature<LineString>}
            line={{
              color: MAP_ANNOTATION_COLORS.playArea,
              width: PREVIEW_STROKE,
              dashArray: cssPxDashToMapLibre(POLYGON_DASH, PREVIEW_STROKE),
            }}
          />
          <MapLibrePointMarkers
            id="framing-polygon-vertices"
            markers={vertexMarkers}
          />
        </>
      ) : null}
    </>
  );
}
