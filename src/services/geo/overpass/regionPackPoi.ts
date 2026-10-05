import {
  distanceBetweenPoints,
  isPointInGameArea,
  type LatLngTuple,
} from "@/domain/geometry/gameArea/geometry";
import type { GameArea, TentaclePoi } from "@/domain/map/annotations";
import type { MeasuringLocationCategory, TentacleExtendedCategoryId } from "@/domain/questions";
import {
  isPackGeoPointCategory,
  isPackGeoTentacleCategory,
  PACK_GEO_PACK_IDS,
  packGeoPoiUrl,
} from "@/domain/regions/packGeoManifest";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  fetchAndReadWithTimeout,
  GEO_FETCH_TIMEOUT_MS,
  isTransientFetchError,
} from "@/services/core/network/fetchWithTimeout";
import { collapsePoiPlaceName, sanitizeBundledPoiPlaces } from "./bundledPoiHygiene";
import type { MeasuringPlace } from "./measuringPlaces";

export interface BundledPoiPlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface BundledPoiCategory {
  category: string;
  source: string;
  places: BundledPoiPlace[];
}

const BUNDLED_POI_PACKS = new Set<RegionPackId>(PACK_GEO_PACK_IDS);

const bundleCache = new Map<string, BundledPoiCategory | null>();

const WIKIDATA_QID_RE = /^Q\d+$/;

function normalizePlaceName(name: string): string {
  return collapsePoiPlaceName(name);
}

function placeQid(place: { id: string; wikidataId?: string }): string | undefined {
  if (place.wikidataId && WIKIDATA_QID_RE.test(place.wikidataId)) {
    return place.wikidataId;
  }
  if (WIKIDATA_QID_RE.test(place.id)) {
    return place.id;
  }
  return undefined;
}

function mergePlacesByIdentity<T extends { id: string; name: string; wikidataId?: string }>(
  overpassPlaces: T[],
  bundledPlaces: T[],
): T[] {
  const bundledByQid = new Map<string, T>();
  for (const place of bundledPlaces) {
    if (WIKIDATA_QID_RE.test(place.id)) {
      bundledByQid.set(place.id, place);
    }
  }

  const claimedQids = new Set<string>();
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const seenQids = new Set<string>();
  const merged: T[] = [];

  const markSeen = (place: T, qid?: string) => {
    seenIds.add(place.id);
    seenNames.add(normalizePlaceName(place.name));
    if (qid) {
      seenQids.add(qid);
    }
  };

  for (const place of overpassPlaces) {
    const qid = placeQid(place);
    if (qid && bundledByQid.has(qid)) {
      if (!claimedQids.has(qid)) {
        const bundled = bundledByQid.get(qid)!;
        merged.push(bundled);
        claimedQids.add(qid);
        markSeen(bundled, qid);
      }
      continue;
    }

    merged.push(place);
    markSeen(place, qid);
  }

  for (const place of bundledPlaces) {
    if (seenIds.has(place.id)) {
      continue;
    }

    const normalizedName = normalizePlaceName(place.name);
    if (seenNames.has(normalizedName)) {
      continue;
    }

    const qid = placeQid(place);
    if (qid && (claimedQids.has(qid) || seenQids.has(qid))) {
      continue;
    }

    markSeen(place, qid);
    merged.push(place);
  }

  return merged;
}

async function loadBundledPoiCategory(
  regionPackId: RegionPackId,
  category: MeasuringLocationCategory,
): Promise<BundledPoiCategory | null> {
  if (!BUNDLED_POI_PACKS.has(regionPackId)) {
    return null;
  }

  const cacheKey = `${regionPackId}:${category}`;
  if (bundleCache.has(cacheKey)) {
    return bundleCache.get(cacheKey) ?? null;
  }

  const url = packGeoPoiUrl(regionPackId, category);

  try {
    const payload = await fetchAndReadWithTimeout(
      url,
      undefined,
      GEO_FETCH_TIMEOUT_MS,
      async (response) => (response.ok ? ((await response.json()) as BundledPoiCategory) : null),
    );
    if (!payload || !Array.isArray(payload.places)) {
      bundleCache.set(cacheKey, null);
      return null;
    }

    const sanitized: BundledPoiCategory = {
      ...payload,
      places: sanitizeBundledPoiPlaces(payload.places, category),
    };

    bundleCache.set(cacheKey, sanitized);
    return sanitized;
  } catch (error) {
    // Timeouts / offline say nothing about the asset; leave uncached so the next call retries.
    if (!isTransientFetchError(error)) {
      bundleCache.set(cacheKey, null);
    }
    return null;
  }
}

export function mergeTentaclePois(
  overpassPois: TentaclePoi[],
  bundledPois: TentaclePoi[],
): TentaclePoi[] {
  return mergePlacesByIdentity(overpassPois, bundledPois);
}

export async function fetchBundledTentaclePois(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: TentacleExtendedCategoryId,
  regionPackId?: RegionPackId,
): Promise<TentaclePoi[]> {
  if (
    !regionPackId ||
    !isPackGeoTentacleCategory(categoryId) ||
    !isPackGeoPointCategory(categoryId)
  ) {
    return [];
  }

  const bundle = await loadBundledPoiCategory(
    regionPackId,
    categoryId as MeasuringLocationCategory,
  );
  if (!bundle) {
    return [];
  }

  return bundle.places
    .map((place): TentaclePoi | null => {
      const point: LatLngTuple = [place.lat, place.lng];
      const distanceMeters = distanceBetweenPoints(center, point);
      if (distanceMeters > radiusMeters) {
        return null;
      }

      return {
        id: place.id,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        category: categoryId,
      };
    })
    .filter((poi): poi is TentaclePoi => poi !== null);
}

export function mergeMeasuringPlaces(
  overpassPlaces: MeasuringPlace[],
  bundledPlaces: MeasuringPlace[],
): MeasuringPlace[] {
  return mergePlacesByIdentity(overpassPlaces, bundledPlaces);
}

export async function fetchBundledMeasuringPlaces(
  gameArea: GameArea,
  category: MeasuringLocationCategory,
  regionPackId?: RegionPackId,
): Promise<MeasuringPlace[]> {
  if (!regionPackId || !isPackGeoPointCategory(category)) {
    return [];
  }

  const bundle = await loadBundledPoiCategory(regionPackId, category);
  if (!bundle) {
    return [];
  }

  return bundle.places
    .map((place) => {
      const point: LatLngTuple = [place.lat, place.lng];
      if (!isPointInGameArea(point, gameArea)) {
        return null;
      }

      return {
        id: place.id,
        name: place.name,
        point,
      } satisfies MeasuringPlace;
    })
    .filter((place): place is MeasuringPlace => place !== null);
}

export function clearBundledPoiCacheForTests(): void {
  bundleCache.clear();
}
