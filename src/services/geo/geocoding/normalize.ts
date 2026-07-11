import type { GameArea } from "../../../domain/map/annotations";
import { normalizeBoundingBox } from "../../../domain/geometry/gameAreaBounds";
import type { LatLngTuple } from "../../../domain/geometry/geometry";
import {
  computeApproximateAreaSqMi,
  placeCategoryLabel,
} from "../geocodingRank";

export interface GeocodedPlace {
  id: string;
  displayName: string;
  bounds: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  center: LatLngTuple;
  boundary?: GameArea;
  placeCategory: string;
  approximateAreaSqMi: number;
}

export interface NominatimGeoJson {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  geojson?: NominatimGeoJson;
  address?: Record<string, string>;
  type?: string;
  class?: string;
  addresstype?: string;
  place_rank?: number;
  importance?: number;
}

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export const VIEWBOX_RADIUS_DEG = 2.25;

export function locationBucketKey(point: LatLngTuple): string {
  const lat = Math.round(point[0] * 2) / 2;
  const lon = Math.round(point[1] * 2) / 2;
  return `${lat},${lon}`;
}

export function viewboxForPoint(point: LatLngTuple): {
  west: number;
  north: number;
  east: number;
  south: number;
} {
  const [lat, lon] = point;
  const lonDelta = VIEWBOX_RADIUS_DEG / Math.cos((lat * Math.PI) / 180);

  return {
    west: lon - lonDelta,
    north: lat + VIEWBOX_RADIUS_DEG,
    east: lon + lonDelta,
    south: lat - VIEWBOX_RADIUS_DEG,
  };
}

export const ADMIN_LEVEL_ADDRESS_KEYS: Record<number, readonly string[]> = {
  4: ["state", "region", "province", "county"],
  6: ["county", "state_district", "district"],
  8: ["city", "town", "village", "municipality", "borough"],
  9: ["city_district", "borough", "suburb", "quarter", "neighbourhood"],
};

async function geoJsonToGameArea(
  geojson: NominatimGeoJson | undefined,
): Promise<GameArea | undefined> {
  if (!geojson) {
    return undefined;
  }

  const { simplifyGameArea } = await import("../../../domain/geometry/geometry");

  if (geojson.type === "Polygon") {
    return simplifyGameArea({
      type: "Polygon",
      coordinates: geojson.coordinates as number[][][],
    });
  }

  if (geojson.type === "MultiPolygon") {
    return simplifyGameArea({
      type: "MultiPolygon",
      coordinates: geojson.coordinates as number[][][][],
    });
  }

  return undefined;
}

function enrichParsedPlace(
  partial: Omit<GeocodedPlace, "placeCategory" | "approximateAreaSqMi">,
  metadata: { addresstype?: string; type?: string; class?: string },
): GeocodedPlace {
  return {
    ...partial,
    placeCategory: placeCategoryLabel(metadata),
    approximateAreaSqMi: computeApproximateAreaSqMi(partial),
  };
}

export async function parseNominatimResult(
  result: NominatimResult,
): Promise<GeocodedPlace> {
  const [south, north, west, east] = result.boundingbox.map(Number);
  const boundary = await geoJsonToGameArea(result.geojson);

  return enrichParsedPlace(
    {
      id: String(result.place_id),
      displayName: result.display_name,
      bounds: normalizeBoundingBox({ south, west, north, east }),
      center: [Number(result.lat), Number(result.lon)],
      boundary,
    },
    result,
  );
}

export function adminLabelFromAddress(
  address: Record<string, string> | undefined,
  adminLevel: number,
): string | null {
  if (!address) {
    return null;
  }

  const keys = ADMIN_LEVEL_ADDRESS_KEYS[adminLevel] ?? [];
  for (const key of keys) {
    const value = address[key]?.trim();
    if (value) {
      return value;
    }
  }

  return null;
}

export function placeHasBoundary(place: GeocodedPlace): boolean {
  return place.boundary !== undefined;
}
