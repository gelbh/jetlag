import {
  normalizeBoundingBox,
  type BoundingBox,
} from "../geometry/gameArea/gameAreaBounds";

export type MapLatLngTuple = [lat: number, lng: number];
export type MapLatLng = MapLatLngTuple | { lat: number; lng: number };

/** SW/NE corners as `[lat, lng]` pairs. */
export type MapBoundsExpression = [MapLatLngTuple, MapLatLngTuple];

export interface MapBounds {
  getSouthWest(): { lat: number; lng: number };
  getNorthEast(): { lat: number; lng: number };
  getSouth(): number;
  getNorth(): number;
  getWest(): number;
  getEast(): number;
}

export interface MapViewportBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function createMapBounds(viewport: MapViewportBounds): MapBounds {
  const v = viewport;
  return {
    getSouthWest: () => ({ lat: v.south, lng: v.west }),
    getNorthEast: () => ({ lat: v.north, lng: v.east }),
    getSouth: () => v.south,
    getNorth: () => v.north,
    getWest: () => v.west,
    getEast: () => v.east,
  };
}

export function normalizeBoundsExpression(
  expression: MapBoundsExpression | MapBounds | MapViewportBounds,
): MapViewportBounds {
  if (
    "south" in expression &&
    "west" in expression &&
    "north" in expression &&
    "east" in expression &&
    !("getSouthWest" in expression)
  ) {
    return expression;
  }
  if ("getSouthWest" in expression && "getNorthEast" in expression) {
    const bounds = expression as MapBounds;
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();
    return {
      south: southWest.lat,
      west: southWest.lng,
      north: northEast.lat,
      east: northEast.lng,
    };
  }
  if (Array.isArray(expression)) {
    const [[south, west], [north, east]] = expression;
    return { south, west, north, east };
  }
  throw new Error("Invalid map bounds expression");
}

export function toMapBounds(
  expression: MapBoundsExpression | MapBounds,
): MapBounds {
  if ("getSouthWest" in expression) {
    return expression;
  }
  return createMapBounds(normalizeBoundsExpression(expression));
}

export function boundingBoxToBoundsExpression(
  box: BoundingBox,
): MapBoundsExpression {
  const normalized = normalizeBoundingBox(box);
  return [
    [normalized.south, normalized.west],
    [normalized.north, normalized.east],
  ];
}

export function mapBoundsToViewport(bounds: MapBounds): MapViewportBounds {
  return normalizeBoundsExpression(bounds);
}
