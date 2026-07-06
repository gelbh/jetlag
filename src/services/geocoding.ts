import type { GameArea } from "../domain/annotations";
import { normalizeBoundingBox } from "../domain/gameAreaBounds";
import type { LatLngTuple } from "../domain/geometry";
import {
  computeApproximateAreaSqMi,
  placeCategoryLabel,
  rankGeocodedPlaceCandidates,
  type RankedGeocodedPlaceCandidate,
} from "./geocodingRank";
import {
  getOrFetchCached,
  geographicCacheKey,
} from "./geographicFeatureCache";
import { FetchTimeoutError, fetchWithTimeout } from "./fetchWithTimeout";
import { retryAsync } from "./retryAsync";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_ENDPOINT =
  "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "JetLagMapCompanion/1.0";
const NOMINATIM_FETCH_TIMEOUT_MS = 15_000;
const NOMINATIM_MAX_RETRIES = 2;
const SEARCH_RESULT_LIMIT = 8;
const VIEWBOX_RADIUS_DEG = 2.25;

export interface SearchPlacesOptions {
  near?: LatLngTuple;
}

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
  type?: string;
  class?: string;
  addresstype?: string;
  place_rank?: number;
  importance?: number;
}

function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

function geocodeSearchCacheKey(query: string): string {
  return geographicCacheKey(
    {
      type: "Polygon",
      coordinates: [[[0, 0]]],
    },
    `geocode:search:v2:${normalizeSearchQuery(query)}`,
  );
}

function locationBucketKey(point: LatLngTuple): string {
  const lat = Math.round(point[0] * 2) / 2;
  const lon = Math.round(point[1] * 2) / 2;
  return `${lat},${lon}`;
}

function geocodeSearchBiasCacheKey(query: string, near: LatLngTuple): string {
  return geographicCacheKey(
    {
      type: "Polygon",
      coordinates: [[[near[0], near[1]]]],
    },
    `geocode:search:bias:v1:${normalizeSearchQuery(query)}:${locationBucketKey(near)}`,
  );
}

function viewboxForPoint(point: LatLngTuple): {
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

function geocodeReverseCacheKey(point: LatLngTuple, adminLevel: number): string {
  return geographicCacheKey(
    {
      type: "Polygon",
      coordinates: [[[point[0], point[1]]]],
    },
    `geocode:reverse:${adminLevel}`,
  );
}

function isRetryableGeocodingError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  if (error instanceof Error && error.message.includes("Failed to fetch")) {
    return true;
  }

  return false;
}

function isRetryableGeocodingStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function fetchNominatim(
  url: URL,
  failureMessage = "Place search failed.",
): Promise<NominatimResult[] | NominatimResult> {
  return retryAsync(
    async () => {
      const response = await fetchWithTimeout(
        url.toString(),
        {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
        },
        NOMINATIM_FETCH_TIMEOUT_MS,
      );

      if (!response.ok) {
        if (isRetryableGeocodingStatus(response.status)) {
          throw new TypeError(`Geocoding request failed with ${response.status}.`);
        }

        throw new Error(failureMessage);
      }

      return (await response.json()) as NominatimResult[] | NominatimResult;
    },
    {
      maxRetries: NOMINATIM_MAX_RETRIES,
      shouldRetry: isRetryableGeocodingError,
    },
  );
}

async function geoJsonToGameArea(
  geojson: NominatimGeoJson | undefined,
): Promise<GameArea | undefined> {
  if (!geojson) {
    return undefined;
  }

  const { simplifyGameArea } = await import("../domain/geometry");

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

async function fetchNominatimSearch(
  query: string,
  options?: {
    featureType?: "city";
    viewbox?: { west: number; north: number; east: number; south: number };
  },
): Promise<NominatimResult[]> {
  const url = new URL(NOMINATIM_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");

  if (options?.featureType) {
    url.searchParams.set("featureType", options.featureType);
  }

  if (options?.viewbox) {
    const { west, north, east, south } = options.viewbox;
    url.searchParams.set("viewbox", `${west},${north},${east},${south}`);
  }

  return (await fetchNominatim(url)) as NominatimResult[];
}

async function candidatesFromResults(
  results: NominatimResult[],
  fromCityQuery: boolean,
): Promise<RankedGeocodedPlaceCandidate[]> {
  return Promise.all(
    results.map(async (result) => ({
      place: await parseNominatimResult(result),
      importance: result.importance ?? 0,
      fromCityQuery,
    })),
  );
}

function mergeSearchCandidates(
  defaultCandidates: RankedGeocodedPlaceCandidate[],
  cityCandidates: RankedGeocodedPlaceCandidate[],
): RankedGeocodedPlaceCandidate[] {
  const merged = new Map<string, RankedGeocodedPlaceCandidate>();

  for (const candidate of [...defaultCandidates, ...cityCandidates]) {
    const existing = merged.get(candidate.place.id);
    if (!existing) {
      merged.set(candidate.place.id, candidate);
      continue;
    }

    merged.set(candidate.place.id, {
      place: candidate.place,
      importance: Math.max(existing.importance, candidate.importance),
      fromCityQuery: existing.fromCityQuery || candidate.fromCityQuery,
    });
  }

  return [...merged.values()];
}

async function fetchSearchCandidates(
  query: string,
  options?: {
    viewbox?: { west: number; north: number; east: number; south: number };
  },
): Promise<RankedGeocodedPlaceCandidate[]> {
  const [defaultResults, cityResults] = await Promise.all([
    fetchNominatimSearch(query, { viewbox: options?.viewbox }),
    fetchNominatimSearch(query, { featureType: "city", viewbox: options?.viewbox }),
  ]);

  return mergeSearchCandidates(
    await candidatesFromResults(defaultResults, false),
    await candidatesFromResults(cityResults, true),
  );
}

export async function searchPlaces(
  query: string,
  options?: SearchPlacesOptions,
): Promise<GeocodedPlace[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  if (!options?.near) {
    return getOrFetchCached(geocodeSearchCacheKey(trimmed), async () => {
      const candidates = await fetchSearchCandidates(trimmed);
      return rankGeocodedPlaceCandidates(candidates, trimmed).slice(
        0,
        SEARCH_RESULT_LIMIT,
      );
    });
  }

  const near = options.near;
  const [unbiasedCandidates, biasedCandidates] = await Promise.all([
    fetchSearchCandidates(trimmed),
    getOrFetchCached(
      geocodeSearchBiasCacheKey(trimmed, near),
      () => fetchSearchCandidates(trimmed, { viewbox: viewboxForPoint(near) }),
    ),
  ]);

  const merged = mergeSearchCandidates(unbiasedCandidates, biasedCandidates);
  return rankGeocodedPlaceCandidates(merged, trimmed, near).slice(
    0,
    SEARCH_RESULT_LIMIT,
  );
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
  return getOrFetchCached(
    geocodeReverseCacheKey(point, adminLevel),
    async () => {
      const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
      url.searchParams.set("lat", String(point[0]));
      url.searchParams.set("lon", String(point[1]));
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("zoom", String(adminLevel));

      const payload = (await fetchNominatim(
        url,
        "Reverse geocoding failed.",
      )) as NominatimResult;
      const adminLabel = adminLabelFromAddress(payload.address, adminLevel);
      if (!adminLabel) {
        return null;
      }

      const place = await parseNominatimResult(payload);
      return {
        ...place,
        displayName: adminLabel,
        id: `${adminLevel}:${adminLabel}`,
      };
    },
    { persistEmpty: false },
  );
}
