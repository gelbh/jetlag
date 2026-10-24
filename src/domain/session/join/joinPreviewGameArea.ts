import type { GameArea } from "../../map/annotations";

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
  return a.type === b.type && JSON.stringify(a.coordinates) === JSON.stringify(b.coordinates);
}

export function isPlaceholderGameArea(gameArea: GameArea): boolean {
  return (
    gameAreaCoordinatesEqual(gameArea, JOIN_PREVIEW_PLACEHOLDER_AREA) ||
    gameAreaCoordinatesEqual(gameArea, ZERO_FALLBACK_GAME_AREA)
  );
}
