import type { GameArea } from "../../domain/map/annotations";
import { REGION_PACK_REFERENCE_BBOXES } from "../../domain/regions/packGeoManifest";

/** City-scale Dublin play area (~25 km × 20 km). Excludes Dublin Airport (DUB). */
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

/** County-scale Dublin play area from the shipped pack reference bbox (includes DUB). */
export const DUBLIN_COUNTY_GAME_AREA: GameArea = (() => {
  const { south, west, north, east } = REGION_PACK_REFERENCE_BBOXES.dublin;
  return {
    type: "Polygon",
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
})();
