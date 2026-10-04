import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import { FetchTimeoutError, fetchWithTimeout } from "../../core/network/fetchWithTimeout";
import { retryAsync } from "../../core/network/retryAsync";
import { geographicCacheKey, getOrFetchCached } from "../cache";
import {
  mergeRankedGeocodedPlaceCandidates,
  placeBoundsFingerprint,
  type RankedGeocodedPlaceCandidate,
  rankGeocodedPlaceCandidates,
} from "../geocoding/geocodingRank";
import {
  adminLabelFromAddress,
  type GeocodedPlace,
  locationBucketKey,
  type NominatimResult,
  normalizeSearchQuery,
  parseNominatimResult,
  viewboxForPoint,
} from "./normalize";

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "JetLagMapCompanion/1.0";
const NOMINATIM_FETCH_TIMEOUT_MS = 15_000;
const NOMINATIM_MAX_RETRIES = 2;
const SEARCH_RESULT_LIMIT = 8;

export interface SearchPlacesOptions {
  near?: LatLngTuple;
}

function nominatimAcceptLanguage(): string {
  if (typeof navigator === "undefined") {
    return "en";
  }
  const language = navigator.language?.trim();
  return language && language.length > 0 ? language : "en";
}

function geocodeSearchCacheKey(query: string, language: string): string {
  return geographicCacheKey(
    {
      type: "Polygon",
      coordinates: [[[0, 0]]],
    },
    `geocode:search:v7:${normalizeSearchQuery(query)}:${language}`,
  );
}

function geocodeSearchBiasCacheKey(query: string, near: LatLngTuple, language: string): string {
  return geographicCacheKey(
    {
      type: "Polygon",
      coordinates: [[[near[0], near[1]]]],
    },
    `geocode:search:bias:v4:${normalizeSearchQuery(query)}:${locationBucketKey(near)}:${language}`,
  );
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
            "Accept-Language": nominatimAcceptLanguage(),
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
  url.searchParams.set("accept-language", nominatimAcceptLanguage());

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
  ...groups: RankedGeocodedPlaceCandidate[][]
): RankedGeocodedPlaceCandidate[] {
  const merged = new Map<string, RankedGeocodedPlaceCandidate>();

  for (const candidate of groups.flat()) {
    const key = placeBoundsFingerprint(candidate.place);
    const existing = merged.get(key);
    merged.set(key, existing ? mergeRankedGeocodedPlaceCandidates(existing, candidate) : candidate);
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

  const language = nominatimAcceptLanguage();

  if (!options?.near) {
    return getOrFetchCached(geocodeSearchCacheKey(trimmed, language), async () => {
      const candidates = await fetchSearchCandidates(trimmed);
      return rankGeocodedPlaceCandidates(candidates, trimmed).slice(0, SEARCH_RESULT_LIMIT);
    });
  }

  const near = options.near;
  const [unbiasedCandidates, biasedCandidates] = await Promise.all([
    fetchSearchCandidates(trimmed),
    getOrFetchCached(geocodeSearchBiasCacheKey(trimmed, near, language), () =>
      fetchSearchCandidates(trimmed, { viewbox: viewboxForPoint(near) }),
    ),
  ]);

  const merged = mergeSearchCandidates(unbiasedCandidates, biasedCandidates);
  return rankGeocodedPlaceCandidates(merged, trimmed, near).slice(0, SEARCH_RESULT_LIMIT);
}

export type SearchPlacesSettled =
  | { ok: true; places: GeocodedPlace[] }
  | { ok: false; message: string };

export async function searchPlacesSettled(
  query: string,
  options?: SearchPlacesOptions,
): Promise<SearchPlacesSettled> {
  try {
    const places = await searchPlaces(query, options);
    return { ok: true, places };
  } catch (nextError) {
    return {
      ok: false,
      message: nextError instanceof Error ? nextError.message : "Place search failed.",
    };
  }
}

const SUGGEST_REVERSE_ZOOMS = [10, 8, 5] as const;

function geocodeReverseSuggestCacheKey(point: LatLngTuple, zoom: number, language: string): string {
  return geographicCacheKey(
    {
      type: "Polygon",
      coordinates: [[[point[0], point[1]]]],
    },
    `geocode:reverse-suggest:v1:${zoom}:${language}`,
  );
}

function isNominatimPlaceResult(
  payload: NominatimResult | NominatimResult[] | { error?: string },
): payload is NominatimResult {
  return (
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "lat" in payload &&
    "lon" in payload &&
    "boundingbox" in payload
  );
}

async function reverseSuggestCandidate(
  point: LatLngTuple,
  zoom: (typeof SUGGEST_REVERSE_ZOOMS)[number],
): Promise<RankedGeocodedPlaceCandidate | null> {
  const url = new URL(NOMINATIM_REVERSE_ENDPOINT);
  url.searchParams.set("lat", String(point[0]));
  url.searchParams.set("lon", String(point[1]));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("polygon_geojson", "1");
  url.searchParams.set("zoom", String(zoom));
  url.searchParams.set("accept-language", nominatimAcceptLanguage());

  const payload = await fetchNominatim(url, "Reverse geocoding failed.");
  if (!isNominatimPlaceResult(payload)) {
    return null;
  }

  return {
    place: await parseNominatimResult(payload),
    importance: payload.importance ?? 0,
    fromCityQuery: zoom >= 10,
  };
}

/** Nearby playable admin areas (city / county / state) for a GPS point. */
export async function suggestPlacesAtPoint(point: LatLngTuple): Promise<GeocodedPlace[]> {
  const language = nominatimAcceptLanguage();
  const groups = await Promise.all(
    SUGGEST_REVERSE_ZOOMS.map((zoom) =>
      getOrFetchCached(
        geocodeReverseSuggestCacheKey(point, zoom, language),
        async () => {
          const candidate = await reverseSuggestCandidate(point, zoom);
          return candidate ? [candidate] : [];
        },
        { persistEmpty: false },
      ),
    ),
  );

  const merged = mergeSearchCandidates(...groups);
  return rankGeocodedPlaceCandidates(merged, "", point).slice(0, SEARCH_RESULT_LIMIT);
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
      url.searchParams.set("accept-language", nominatimAcceptLanguage());

      const payload = (await fetchNominatim(url, "Reverse geocoding failed.")) as NominatimResult;
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
