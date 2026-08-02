import { CompensatedCircle } from "../helpers/CompensatedCircle";
import { CompensatedCircleMarker } from "../helpers/CompensatedCircleMarker";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
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
  const logicalStroke = useZoomAdaptiveWeight(PREVIEW_STROKE_BASE);
  const logicalMarkerWeight = useZoomAdaptiveWeight(PREVIEW_MARKER_WEIGHT_BASE);
  const radiusScale = logicalStroke / PREVIEW_STROKE_BASE;

  return (
    <>
      {gameArea ? <GameAreaMask gameArea={gameArea} framing /> : null}

      {framingMode === "circle" && circleCenter && circleRadiusMeters ? (
        <>
          <CompensatedCircle
            center={circleCenter}
            radius={circleRadiusMeters}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.playArea,
              weight: logicalStroke,
              dashArray: scaleDashArray(
                CIRCLE_DASH,
                logicalStroke,
                PREVIEW_STROKE_BASE,
              ),
              fillColor: MAP_ANNOTATION_COLORS.playArea,
              fillOpacity: 0.08,
            }}
          />
          <CompensatedCircleMarker
            center={circleCenter}
            radius={CENTER_MARKER_RADIUS * radiusScale}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: logicalMarkerWeight,
              fillColor: MAP_ANNOTATION_COLORS.playArea,
              fillOpacity: 1,
            }}
          />
        </>
      ) : null}

      {framingMode === "polygon" && polygonVertices.length > 0 ? (
        <>
          <CompensatedPolyline
            positions={[...polygonVertices]}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.playArea,
              weight: logicalStroke,
              dashArray: scaleDashArray(
                POLYGON_DASH,
                logicalStroke,
                PREVIEW_STROKE_BASE,
              ),
            }}
          />
          {polygonVertices.map(([lat, lng], index) => (
            <CompensatedCircleMarker
              key={`framing-vertex-${index}`}
              center={[lat, lng]}
              radius={VERTEX_MARKER_RADIUS * radiusScale}
              pathOptions={{
                color: MAP_ANNOTATION_COLORS.strokeLight,
                weight: logicalMarkerWeight,
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
