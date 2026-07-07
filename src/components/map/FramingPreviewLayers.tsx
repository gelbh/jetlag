import { Circle, CircleMarker, Polyline } from "react-leaflet";
import { GameAreaMask } from "./GameAreaMask";
import type { GameArea } from "../../domain/map/annotations";
import type { FramingMode } from "../../hooks/session/useGameAreaFraming";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

interface FramingPreviewLayersProps {
  gameArea: GameArea | null;
  framingMode: FramingMode;
  circleCenter: LatLngTuple | null;
  circleRadiusMeters: number | null;
  polygonVertices: readonly LatLngTuple[];
}

export function FramingPreviewLayers({
  gameArea,
  framingMode,
  circleCenter,
  circleRadiusMeters,
  polygonVertices,
}: FramingPreviewLayersProps) {
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
              weight: 3,
              dashArray: "8 6",
              fillColor: MAP_ANNOTATION_COLORS.playArea,
              fillOpacity: 0.08,
            }}
          />
          <CircleMarker
            center={circleCenter}
            radius={8}
            pathOptions={{
              color: MAP_ANNOTATION_COLORS.strokeLight,
              weight: 2,
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
              weight: 3,
              dashArray: "6 6",
            }}
          />
          {polygonVertices.map(([lat, lng], index) => (
            <CircleMarker
              key={`framing-vertex-${index}`}
              center={[lat, lng]}
              radius={6}
              pathOptions={{
                color: MAP_ANNOTATION_COLORS.strokeLight,
                weight: 2,
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
