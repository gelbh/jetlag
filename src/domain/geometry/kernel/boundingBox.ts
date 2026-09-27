export const MIN_GAME_AREA_LAT_SPAN = 0.005;
export const MIN_GAME_AREA_LNG_SPAN = 0.005;

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function normalizeBoundingBox(box: BoundingBox): BoundingBox {
  let { south, west, north, east } = box;
  const latSpan = north - south;
  const lngSpan = east - west;

  if (latSpan < MIN_GAME_AREA_LAT_SPAN) {
    const centerLat = (north + south) / 2;
    south = centerLat - MIN_GAME_AREA_LAT_SPAN / 2;
    north = centerLat + MIN_GAME_AREA_LAT_SPAN / 2;
  }

  if (lngSpan < MIN_GAME_AREA_LNG_SPAN) {
    const centerLng = (east + west) / 2;
    west = centerLng - MIN_GAME_AREA_LNG_SPAN / 2;
    east = centerLng + MIN_GAME_AREA_LNG_SPAN / 2;
  }

  return { south, west, north, east };
}
