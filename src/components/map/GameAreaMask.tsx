import { Fragment, useMemo } from "react";
import { Polygon, Polyline } from "react-leaflet";
import type { GameArea } from "../../domain/map/annotations";
import {
  gameAreaExteriorStrokeRings,
  gameAreaOutsideMask,
  gameAreaToLeafletPositions,
  type LatLngTuple,
} from "../../domain/geometry/geometry";

import { MAP_ANNOTATION_COLORS } from "../../domain/map/mapAnnotationColors";

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

function renderGameAreaPolygons(
  area: GameArea,
  keyPrefix: string,
  pathOptions: {
    color?: string;
    weight?: number;
    fillColor?: string;
    fillOpacity?: number;
  },
) {
  if (area.type === "MultiPolygon") {
    return area.coordinates.map((polygon, index) => (
      <Polygon
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
    <Polygon
      key={keyPrefix}
      positions={gameAreaToLeafletPositions(area)}
      interactive={false}
      pathOptions={pathOptions}
    />
  );
}

export function GameAreaMask({ gameArea, framing = false }: GameAreaMaskProps) {
  const outsideMask = useMemo(() => gameAreaOutsideMask(gameArea), [gameArea]);
  const exteriorStrokeRings = useMemo(
    () => gameAreaExteriorStrokeRings(gameArea),
    [gameArea],
  );
  const outsideTint = framing ? FRAMING_OUTSIDE_TINT : PLAY_OUTSIDE_TINT;
  const borderOptions = framing
    ? {
        color: MAP_ANNOTATION_COLORS.playArea,
        weight: 3,
        dashArray: "8 6",
      }
    : {
        color: MAP_ANNOTATION_COLORS.playArea,
        weight: 2,
      };

  return (
    <Fragment>
      {outsideMask
        ? renderGameAreaPolygons(outsideMask, "outside-mask", outsideTint)
        : null}
      {exteriorStrokeRings.map((ring, index) => (
        <Polyline
          key={`play-area-border-${index}`}
          positions={ring}
          interactive={false}
          pathOptions={borderOptions}
        />
      ))}
    </Fragment>
  );
}
