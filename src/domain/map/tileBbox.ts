import { type BoundingBox, boundingBoxesIntersect } from "../geometry/gameArea/gameAreaBounds";
import { isEsriTileUrl, isOpenFreeMapUrl } from "./mapTileHosts";

// Relative imports: this module is bundled into the service worker (src/sw.ts).

export interface TileXYZ {
  z: number;
  x: number;
  y: number;
}

const MAX_TILE_ZOOM = 24;

const ESRI_TILE_PATH = /\/tile\/(\d+)\/(\d+)\/(\d+)\/?$/;

const OPENFREEMAP_TILE_PATH = /\/(\d+)\/(\d+)\/(\d+)\.(?:pbf|mvt|png|jpe?g|webp)$/i;

function toTile(z: number, x: number, y: number): TileXYZ | null {
  if (z > MAX_TILE_ZOOM) {
    return null;
  }
  const tilesPerAxis = 2 ** z;
  if (x >= tilesPerAxis || y >= tilesPerAxis) {
    return null;
  }
  return { z, x, y };
}

export function parseTileXYZ(url: string): TileXYZ | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  if (isEsriTileUrl(url)) {
    const match = ESRI_TILE_PATH.exec(pathname);
    return match ? toTile(Number(match[1]), Number(match[3]), Number(match[2])) : null;
  }

  if (isOpenFreeMapUrl(url)) {
    const match = OPENFREEMAP_TILE_PATH.exec(pathname);
    return match ? toTile(Number(match[1]), Number(match[2]), Number(match[3])) : null;
  }

  return null;
}

function tileYToLat(y: number, tilesPerAxis: number): number {
  const n = Math.PI * (1 - (2 * y) / tilesPerAxis);
  return (Math.atan(Math.sinh(n)) * 180) / Math.PI;
}

export function tileToBbox(z: number, x: number, y: number): BoundingBox {
  const tilesPerAxis = 2 ** z;
  return {
    west: (x / tilesPerAxis) * 360 - 180,
    east: ((x + 1) / tilesPerAxis) * 360 - 180,
    north: tileYToLat(y, tilesPerAxis),
    south: tileYToLat(y + 1, tilesPerAxis),
  };
}

export function isTileInGameArea(url: string, gameAreaBbox: BoundingBox | null): boolean {
  if (!gameAreaBbox) {
    return false;
  }
  const tile = parseTileXYZ(url);
  return tile ? boundingBoxesIntersect(tileToBbox(tile.z, tile.x, tile.y), gameAreaBbox) : false;
}
