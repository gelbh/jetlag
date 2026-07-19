import type { GameArea } from "../map/annotations";

/** Polygon at [0,0]–[1,1] used when join cannot read the session doc yet. */
export const JOIN_PREVIEW_PLACEHOLDER_AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
      [0, 0],
    ],
  ],
};

/** Leaflet-free copy of `ZERO_GAME_AREA` (avoid importing geometry → leaflet in Node/emulator). */
const ZERO_FALLBACK_GAME_AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ],
  ],
};

function gameAreaCoordinatesEqual(a: GameArea, b: GameArea): boolean {
  return (
    a.type === b.type &&
    JSON.stringify(a.coordinates) === JSON.stringify(b.coordinates)
  );
}

/** True for join-preview Null Island (0–1°) or the zero fallback polygon. */
export function isPlaceholderGameArea(gameArea: GameArea): boolean {
  return (
    gameAreaCoordinatesEqual(gameArea, JOIN_PREVIEW_PLACEHOLDER_AREA) ||
    gameAreaCoordinatesEqual(gameArea, ZERO_FALLBACK_GAME_AREA)
  );
}
