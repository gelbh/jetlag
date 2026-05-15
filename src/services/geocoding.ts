import type { GameArea } from "../domain/annotations";
import type { LatLngTuple } from "../domain/geometry";
import { normalizeBoundingBox, simplifyGameArea } from "../domain/geometry";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_ENDPOINT =
  "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "JetLagMapCompanion/1.0";

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
}

interface NominatimGeoJson {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox: [string, string, string, string];
  geojson?: NominatimGeoJson;
  address?: Record<string, string>;
}

function geoJsonToGameArea(
  geojson: NominatimGeoJson | undefined,
): GameArea | undefined {
  if (!geojson) {
    return undefined;
  }

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

export function parseNominatimResult(result: NominatimResult): GeocodedPlace {
  const [south, north, west, east] = result.boundingbox.map(Number);
  const boundary = geoJsonToGameArea(result.geojson);

  return {
    id: String(result.place_id),
    displayName: result.display_name,
    bounds: normalizeBoundingBox({ south, west, north, east }),
    center: [Number(result.lat), Number(result.lon)],
    boundary,
  };
}

export async function searchPlaces(query: string): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error("Place search failed.");
  }

  const payload = (await response.json()) as NominatimResult[];
  return payload.map(parseNominatimResult);
}

export function placeHasBoundary(place: GeocodedPlace): boolean {
  return place.boundary !== undefined;
}

const ADMIN_LEVEL_ADDRESS_KEYS: Record<number, readonly string[]> = {
  4: ["state", "region", "province", "county"],
  6: ["county", "state_district", "district"],
  8: ["city", "town", "village", "municipality", "borough"],
  9: ["city_district", "borough", "suburb", "quarter", "neighbourhood"],
};

function adminLabelFromAddress(
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

export async function reverseGeocodePoint(
  point: LatLngTuple,
  adminLevel: number,
): Promise<GeocodedPlace | null> {
  const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
  url.searchParams.set("lat", String(point[0]));
  url.searchParams.set("lon", String(point[1]));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", String(adminLevel));

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const payload = (await response.json()) as NominatimResult;
  const adminLabel = adminLabelFromAddress(payload.address, adminLevel);
  if (!adminLabel) {
    return null;
  }

  const place = parseNominatimResult(payload);
  return {
    ...place,
    displayName: adminLabel,
    id: `${adminLevel}:${adminLabel}`,
  };
}
