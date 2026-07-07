import type { Position } from "geojson";
import type { GameArea } from "../map/annotations";

const MIN_GAME_AREA_LAT_SPAN = 0.005;
const MIN_GAME_AREA_LNG_SPAN = 0.005;

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

export function intersectBoundingBoxes(
  a: BoundingBox,
  b: BoundingBox,
): BoundingBox | null {
  const south = Math.max(a.south, b.south);
  const west = Math.max(a.west, b.west);
  const north = Math.min(a.north, b.north);
  const east = Math.min(a.east, b.east);

  if (south >= north || west >= east) {
    return null;
  }

  return normalizeBoundingBox({ south, west, north, east });
}

function collectPositions(gameArea: GameArea): Position[] {
  if (gameArea.type === "MultiPolygon") {
    return gameArea.coordinates.flatMap((polygon) =>
      polygon.flatMap((ring) => ring),
    );
  }

  return gameArea.coordinates.flatMap((ring) => ring);
}

export function boundingBoxToGameArea(box: BoundingBox): GameArea {
  const normalized = normalizeBoundingBox(box);

  return {
    type: "Polygon",
    coordinates: [
      [
        [normalized.west, normalized.south],
        [normalized.east, normalized.south],
        [normalized.east, normalized.north],
        [normalized.west, normalized.north],
        [normalized.west, normalized.south],
      ],
    ],
  };
}

export function gameAreaToBoundingBox(gameArea: GameArea): BoundingBox {
  const positions = collectPositions(gameArea);
  const lngs = positions.map(([lng]) => lng);
  const lats = positions.map(([, lat]) => lat);

  return normalizeBoundingBox({
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  });
}

export function expandBoundingBox(
  box: BoundingBox,
  bufferMeters: number,
): BoundingBox {
  if (bufferMeters <= 0) {
    return normalizeBoundingBox(box);
  }

  const centerLat = (box.north + box.south) / 2;
  const latDelta = bufferMeters / 111_320;
  const lngDelta =
    bufferMeters / (111_320 * Math.cos((centerLat * Math.PI) / 180));

  return normalizeBoundingBox({
    south: box.south - latDelta,
    west: box.west - lngDelta,
    north: box.north + latDelta,
    east: box.east + lngDelta,
  });
}
