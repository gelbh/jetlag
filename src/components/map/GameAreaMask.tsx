import { Fragment, useMemo } from "react";
import { Polygon } from "react-leaflet";
import type { GameArea } from "../../domain/annotations";
import {
  gameAreaOutsideMask,
  gameAreaToLeafletPositions,
  type LatLngTuple,
} from "../../domain/geometry";

interface GameAreaMaskProps {
  gameArea: GameArea;
  framing?: boolean;
}

const PLAY_AREA_COLOR = "#38bdf8";
const FRAMING_OUTSIDE_TINT = {
  color: "transparent",
  weight: 0,
  fillColor: "#020617",
  fillOpacity: 0.58,
} as const;
const PLAY_OUTSIDE_TINT = {
  color: PLAY_AREA_COLOR,
  weight: 1,
  fillColor: PLAY_AREA_COLOR,
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

  return (
    <Fragment>
      {outsideMask
        ? renderGameAreaPolygons(outsideMask, "outside-mask", outsideTint)
        : null}
      <Polygon
        positions={gameAreaToLeafletPositions(gameArea)}
        interactive={false}
        pathOptions={{
          color: PLAY_AREA_COLOR,
          weight: 2,
          fillOpacity: framing ? 0.08 : 0,
        }}
      />
    </Fragment>
  );
}
