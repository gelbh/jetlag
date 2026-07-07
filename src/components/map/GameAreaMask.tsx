import { Fragment, useMemo } from "react";
import { Polygon } from "react-leaflet";
import type { GameArea } from "../../domain/map/annotations";
import {
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
  color: MAP_ANNOTATION_COLORS.playArea,
  weight: 1,
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
  const outsideTint = framing ? FRAMING_OUTSIDE_TINT : PLAY_OUTSIDE_TINT;
  const borderOptions = framing
    ? {
        color: MAP_ANNOTATION_COLORS.playArea,
        weight: 3,
        dashArray: "8 6",
        fillOpacity: 0.08,
      }
    : {
        color: MAP_ANNOTATION_COLORS.playArea,
        weight: 2,
        fillOpacity: 0,
      };

  return (
    <Fragment>
      {outsideMask
        ? renderGameAreaPolygons(outsideMask, "outside-mask", outsideTint)
        : null}
      <Polygon
        positions={gameAreaToLeafletPositions(gameArea)}
        interactive={false}
        pathOptions={borderOptions}
      />
    </Fragment>
  );
}
