import { Circle, CircleMarker, Polyline } from "react-leaflet";
import { GameAreaMask } from "./GameAreaMask";
import type { GameArea } from "../../../domain/map/annotations";
import type { FramingMode } from "../../../hooks/session/useGameAreaFraming";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  scaleDashArray,
  useZoomAdaptiveWeight,
} from "../../../hooks/map/useZoomAdaptiveWeight";

interface FramingPreviewLayersProps {
  gameArea: GameArea | null;
  framingMode: FramingMode;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
}

const PREVIEW_STROKE_BASE = 3;
const PREVIEW_MARKER_WEIGHT_BASE = 2;
const CIRCLE_DASH = "8 6";
const POLYGON_DASH = "6 6";
const CENTER_MARKER_RADIUS = 8;
const VERTEX_MARKER_RADIUS = 6;

export function FramingPreviewLayers({
  gameArea,
  framingMode,
  circleCenter,
  circleRadiusMeters,
  polygonVertices,
}: FramingPreviewLayersProps) {
  const strokeWeight = useZoomAdaptiveWeight(PREVIEW_STROKE_BASE);
  const markerWeight = useZoomAdaptiveWeight(PREVIEW_MARKER_WEIGHT_BASE);
  const radiusScale = strokeWeight / PREVIEW_STROKE_BASE;

  return (
    <>
      {gameArea ? <GameAreaMask gameArea={gameArea} framing /> : null}

      {framingMode === "circle" && circleCenter && circleRadiusMeters ? (
        <>
          <Circle
            center={circleCenter}
            radius={circleRadiusMeters}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.playArea,
              weight: strokeWeight,
              dashArray: scaleDashArray(
                CIRCLE_DASH,
                strokeWeight,
                PREVIEW_STROKE_BASE,
              ),
              fillColor: MAP_ANNOTATION_COLORS.playArea,
              fillOpacity: 0.08,
            }}
          />
          <CircleMarker
            center={circleCenter}
            radius={CENTER_MARKER_RADIUS * radiusScale}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: markerWeight,
              fillColor: MAP_ANNOTATION_COLORS.playArea,
              fillOpacity: 1,
            }}
          />
        </>
      ) : null}

      {framingMode === "polygon" && polygonVertices.length > 0 ? (
        <>
          <Polyline
            positions={[...polygonVertices]}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.playArea,
              weight: strokeWeight,
              dashArray: scaleDashArray(
                POLYGON_DASH,
                strokeWeight,
                PREVIEW_STROKE_BASE,
              ),
            }}
          />
          {polygonVertices.map(([lat, lng], index) => (
            <CircleMarker
              key={`framing-vertex-${index}`}
              center={[lat, lng]}
              radius={VERTEX_MARKER_RADIUS * radiusScale}
              pathOptions={{
                color: MAP_ANNOTATION_COLORS.strokeLight,
                weight: markerWeight,
                fillColor: MAP_ANNOTATION_COLORS.playArea,
                fillOpacity: 1,
              }}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
