export const OPEN_METEO_ELEVATION_ENDPOINT =
  "https://api.open-meteo.com/v1/elevation";
export const USGS_EPQS_ENDPOINT = "https://epqs.nationalmap.gov/v1/json";
export const ELEVATION_BATCH_SIZE = 100;
export const USGS_MIN_REQUEST_GAP_MS = 250;
export const ELEVATION_CACHE_TTL_MS = 15 * 60 * 1000;
export const ELEVATION_MAX_RETRIES_FOREGROUND = 6;
export const ELEVATION_MAX_RETRIES_BACKGROUND = 2;
export const ELEVATION_BASE_BACKOFF_MS = 1000;
export const ELEVATION_MAX_BACKOFF_MS = 30_000;
export const ELEVATION_MIN_429_BACKOFF_MS = 2000;
export const ELEVATION_MIN_REQUEST_GAP_MS = 250;
export const ELEVATION_WEIGHTED_CALLS_PER_MINUTE = 400;
export const ELEVATION_MAX_CONCURRENT = 1;
export const ELEVATION_CIRCUIT_BREAKER_THRESHOLD = 3;
export const ELEVATION_CIRCUIT_BREAKER_COOLDOWN_MS = 5 * 60 * 1000;

export type ElevationFetchProfile = "background" | "foreground";

export interface FetchElevationsOptions {
  profile?: ElevationFetchProfile;
}

export interface OpenMeteoElevationResponse {
  elevation: number[];
}

export interface UsgsEpqsResponse {
  value?: number | string;
}

export interface CachedElevation {
  value: number;
  expiresAt: number;
}
