import { Fragment, useMemo } from "react";
import type { FeatureCollection, LineString } from "geojson";
import type { GameArea } from "../../../domain/map/annotations";
import {
  gameAreaExteriorStrokeRings,
  gameAreaOutsideMask,
  gameAreaToLeafletPositions,
  type LatLngTuple,
} from "../../../domain/geometry/gameArea/geometry";

import { MAP_ANNOTATION_COLORS } from "../../../domain/map/mapAnnotationColors";
import {
  scaleDashArray,
  useZoomAdaptiveWeight,
} from "../../../hooks/map/useZoomAdaptiveWeight";
import { useMapEngine } from "../chrome/mapEngineContext";
import { CompensatedPolygon } from "../helpers/CompensatedPolygon";
import { CompensatedPolyline } from "../helpers/CompensatedPolyline";
import {
  MapLibreGeoJsonOverlay,
  polygonGeometryFeature,
} from "../helpers/MapLibreGeoJsonOverlay";
import { MID_GESTURE_PATH_DEFAULTS } from "../helpers/midGesturePathDefaults";

interface GameAreaMaskProps {
  gameArea: GameArea;
  framing?: boolean;
}

const FRAMING_OUTSIDE_TINT = {
  color: "transparent",
  weight: 0,
  fillColor: MAP_ANNOTATION_COLORS.playAreaMask,
  fillOpacity: 0.58,
} as const;

const PLAY_OUTSIDE_TINT = {
  color: "transparent",
  weight: 0,
  fillColor: MAP_ANNOTATION_COLORS.playArea,
  fillOpacity: 0.35,
} as const;

const FRAMING_BASE_WEIGHT = 3;
const PLAY_BASE_WEIGHT = 2;
const FRAMING_DASH = "8 6";
const FRAMING_DASH_ARRAY = [8, 6] as const;

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

function renderGameAreaPolygons(
  area: GameArea,
  keyPrefix: string,
  pathOptions: {
    color?: string;
    weight?: number;
    fillColor?: string;
    fillOpacity?: number;
    noClip?: boolean;
  },
) {
  if (area.type === "MultiPolygon") {
    return area.coordinates.map((polygon, index) => (
      <CompensatedPolygon
        key={`${keyPrefix}-${index}`}
        positions={polygon.map((ring) =>
          ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
        )}
        interactive={false}
        pathOptions={pathOptions}
      />
    ));
  }

  return (
    <CompensatedPolygon
      key={keyPrefix}
      positions={gameAreaToLeafletPositions(area)}
      interactive={false}
      pathOptions={pathOptions}
    />
  );
}

function GameAreaMaskMapLibre({
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
          dashArray: framing ? [...FRAMING_DASH_ARRAY] : undefined,
        }}
      />
    </>
  );
}

function GameAreaMaskLeaflet({
  gameArea,
  framing = false,
}: GameAreaMaskProps) {
  const outsideMask = useMemo(() => gameAreaOutsideMask(gameArea), [gameArea]);
  const exteriorStrokeRings = useMemo(
    () => gameAreaExteriorStrokeRings(gameArea),
    [gameArea],
  );
  const outsideTint = framing ? FRAMING_OUTSIDE_TINT : PLAY_OUTSIDE_TINT;
  const baseWeight = framing ? FRAMING_BASE_WEIGHT : PLAY_BASE_WEIGHT;
  const logicalWeight = useZoomAdaptiveWeight(baseWeight);
  const borderOptions = framing
    ? {
        color: MAP_ANNOTATION_COLORS.playArea,
        weight: logicalWeight,
        dashArray: scaleDashArray(
          FRAMING_DASH,
          logicalWeight,
          FRAMING_BASE_WEIGHT,
        ),
      }
    : {
        color: MAP_ANNOTATION_COLORS.playArea,
        weight: logicalWeight,
      };
  const outsideTintOptions = { ...outsideTint, ...MID_GESTURE_PATH_DEFAULTS };

  return (
    <Fragment>
      {outsideMask
        ? renderGameAreaPolygons(
            outsideMask,
            "outside-mask",
            outsideTintOptions,
          )
        : null}
      {exteriorStrokeRings.map((ring, index) => (
        <CompensatedPolyline
          key={`play-area-border-${index}`}
          positions={ring}
          interactive={false}
          pathOptions={borderOptions}
        />
      ))}
    </Fragment>
  );
}

export function GameAreaMask(props: GameAreaMaskProps) {
  const engine = useMapEngine();
  if (engine === "maplibre") {
    return <GameAreaMaskMapLibre {...props} />;
  }
  return <GameAreaMaskLeaflet {...props} />;
}
