import turfCircle from "@turf/circle";
import type { Feature, LineString } from "geojson";
import { GameAreaMask } from "./GameAreaMask";
import type { GameArea } from "../../../domain/map/annotations";
import type { FramingMode } from "../../../hooks/session/useGameAreaFraming";
import type { LatLngTuple } from "../../../domain/geometry/gameArea/geometry";
import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreDotMarker } from "../helpers/MapLibreDotMarker";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";

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
          <MapLibreDotMarker
            latitude={circleCenter[0]}
            longitude={circleCenter[1]}
            radiusPx={8}
            fillColor={MAP_ANNOTATION_COLORS.playArea}
            borderColor={MAP_ANNOTATION_COLORS.strokeLight}
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
          {polygonVertices.map(([lat, lng], index) => (
            <MapLibreDotMarker
              key={`framing-vertex-${index}`}
              latitude={lat}
              longitude={lng}
              radiusPx={6}
              fillColor={MAP_ANNOTATION_COLORS.playArea}
              borderColor={MAP_ANNOTATION_COLORS.strokeLight}
            />
          ))}
        </>
      ) : null}
    </>
  );
}
