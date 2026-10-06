import type { Feature, LineString } from "geojson";
import {
  isPackGeoSupported,
  packGeoInternationalBorderUrl,
} from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  fetchAndReadWithTimeout,
  GEO_FETCH_TIMEOUT_MS,
  isTransientFetchError,
} from "@/services/core/network/fetchWithTimeout";

export interface BundledInternationalBorderPack {
  source: string;
  bbox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  segments: Feature<LineString>[];
}

const internationalBorderCache = new Map<string, BundledInternationalBorderPack | null>();

function resolveGeoAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

function isLineStringFeature(value: unknown): value is Feature<LineString> {
  if (!value || typeof value !== "object") {
    return false;
  }
  const feature = value as Feature;
  return (
    feature.type === "Feature" &&
    feature.geometry?.type === "LineString" &&
    Array.isArray(feature.geometry.coordinates) &&
    feature.geometry.coordinates.length >= 2
  );
}

export async function loadBundledInternationalBorderPack(
  regionPackId: RegionPackId,
): Promise<BundledInternationalBorderPack | null> {
  if (!isPackGeoSupported(regionPackId, "international_border")) {
    return null;
  }

  if (internationalBorderCache.has(regionPackId)) {
    return internationalBorderCache.get(regionPackId) ?? null;
  }

  try {
    const payload = await fetchAndReadWithTimeout(
      resolveGeoAssetUrl(packGeoInternationalBorderUrl(regionPackId)),
      undefined,
      GEO_FETCH_TIMEOUT_MS,
      async (response) =>
        response.ok
          ? ((await response.json()) as {
              source?: string;
              bbox?: BundledInternationalBorderPack["bbox"];
              segments?: unknown[];
            })
          : null,
    );

    if (!payload || typeof payload.source !== "string" || !Array.isArray(payload.segments)) {
      internationalBorderCache.set(regionPackId, null);
      return null;
    }

    const pack: BundledInternationalBorderPack = {
      source: payload.source,
      bbox: payload.bbox,
      segments: payload.segments.filter(isLineStringFeature),
    };
    internationalBorderCache.set(regionPackId, pack);
    return pack;
  } catch (error) {
    // Timeouts / offline say nothing about the asset; leave uncached so the next call retries.
    if (!isTransientFetchError(error)) {
      internationalBorderCache.set(regionPackId, null);
    }
    return null;
  }
}

export function clearBundledInternationalBorderCacheForTests(): void {
  internationalBorderCache.clear();
}
