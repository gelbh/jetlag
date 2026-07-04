import type { GameArea } from "../../domain/annotations";

/** City-scale Dublin play area (~25 km × 20 km). */
export const DUBLIN_CITY_GAME_AREA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-6.45, 53.27],
      [-6.08, 53.27],
      [-6.08, 53.42],
      [-6.45, 53.42],
      [-6.45, 53.27],
    ],
  ],
};
