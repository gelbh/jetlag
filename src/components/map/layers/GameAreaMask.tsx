import { useMemo } from "react";
import type { GameArea } from "@/domain/map/annotations";
import {
  gameAreaExteriorStrokeRings,
  gameAreaOutsideMask,
} from "@/domain/geometry/gameArea/geometry";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { FeatureCollection, LineString } from "geojson";
import { MAP_ANNOTATION_COLORS } from "@/domain/map/mapAnnotationColors";
import { cssPxDashToMapLibre } from "../helpers/cssPxDashToMapLibre";
import { MapLibreGeoJsonOverlay } from "../helpers/MapLibreGeoJsonOverlay";
import { polygonGeometryFeature } from "../helpers/polygonGeometryFeature";

interface GameAreaMaskProps {
  gameArea: GameArea;
  framing?: boolean;
}

const FRAMING_OUTSIDE_TINT = {
  fillColor: MAP_ANNOTATION_COLORS.playAreaMask,
  fillOpacity: 0.58,
} as const;

const PLAY_OUTSIDE_TINT = {
  fillColor: MAP_ANNOTATION_COLORS.playArea,
  fillOpacity: 0.35,
} as const;

const FRAMING_BASE_WEIGHT = 3;
const PLAY_BASE_WEIGHT = 2;
const FRAMING_DASH = "8 6";

function exteriorStrokeFeatureCollection(
  rings: LatLngTuple[][],
): FeatureCollection<LineString> {
  return {
    type: "FeatureCollection",
    features: rings.map((ring) => ({
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: ring.map(([lat, lng]) => [lng, lat]),
      },
    })),
  };
}

export function GameAreaMask({
  gameArea,
  framing = false,
}: GameAreaMaskProps) {
  const outsideMask = useMemo(() => gameAreaOutsideMask(gameArea), [gameArea]);
  const exteriorStrokeRings = useMemo(
    () => gameAreaExteriorStrokeRings(gameArea),
    [gameArea],
  );
  const exteriorStroke = useMemo(
    () => exteriorStrokeFeatureCollection(exteriorStrokeRings),
    [exteriorStrokeRings],
  );
  const outsideTint = framing ? FRAMING_OUTSIDE_TINT : PLAY_OUTSIDE_TINT;
  const baseWeight = framing ? FRAMING_BASE_WEIGHT : PLAY_BASE_WEIGHT;

  return (
    <>
      {outsideMask ? (
        <MapLibreGeoJsonOverlay
          id="game-area-outside"
          data={polygonGeometryFeature(outsideMask)}
          fill={{
            fillColor: outsideTint.fillColor,
            fillOpacity: outsideTint.fillOpacity,
          }}
        />
      ) : null}
      <MapLibreGeoJsonOverlay
        id="game-area-border"
        data={exteriorStroke}
        line={{
          color: MAP_ANNOTATION_COLORS.playArea,
          width: baseWeight,
          opacity: 1,
          dashArray: framing
            ? cssPxDashToMapLibre(FRAMING_DASH, baseWeight)
            : undefined,
        }}
      />
    </>
  );
}
