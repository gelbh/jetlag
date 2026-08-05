import type { Feature, LineString } from "geojson";
import {
  isPackGeoSupported,
  packGeoCoastlineUrl,
} from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";

export interface BundledCoastlinePack {
  source: string;
  bbox?: {
    south: number;
    west: number;
    north: number;
    east: number;
  };
  segments: Feature<LineString>[];
}

const coastlineCache = new Map<string, BundledCoastlinePack | null>();

function resolveGeoAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

function isLineStringFeature(
  value: unknown,
): value is Feature<LineString> {
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

export async function loadBundledCoastlinePack(
  regionPackId: RegionPackId,
): Promise<BundledCoastlinePack | null> {
  if (!isPackGeoSupported(regionPackId, "coastline")) {
    return null;
  }

  if (coastlineCache.has(regionPackId)) {
    return coastlineCache.get(regionPackId) ?? null;
  }

  try {
    const response = await fetch(
      resolveGeoAssetUrl(packGeoCoastlineUrl(regionPackId)),
    );
    if (!response.ok) {
      coastlineCache.set(regionPackId, null);
      return null;
    }

    const payload = (await response.json()) as {
      source?: string;
      bbox?: BundledCoastlinePack["bbox"];
      segments?: unknown[];
    };

    if (typeof payload.source !== "string" || !Array.isArray(payload.segments)) {
      coastlineCache.set(regionPackId, null);
      return null;
    }

    const pack: BundledCoastlinePack = {
      source: payload.source,
      bbox: payload.bbox,
      segments: payload.segments.filter(isLineStringFeature),
    };
    coastlineCache.set(regionPackId, pack);
    return pack;
  } catch {
    coastlineCache.set(regionPackId, null);
    return null;
  }
}

export function clearBundledCoastlineCacheForTests(): void {
  coastlineCache.clear();
}

export function mergeCoastlineSegments(
  overpassSegments: Feature<LineString>[],
  bundledSegments: Feature<LineString>[],
): Feature<LineString>[] {
  if (bundledSegments.length === 0) {
    return overpassSegments;
  }
  if (overpassSegments.length === 0) {
    return bundledSegments;
  }
  return [...overpassSegments, ...bundledSegments];
}
