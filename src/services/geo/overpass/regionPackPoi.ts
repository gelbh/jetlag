import type { GameArea } from "@/domain/map/annotations";
import { distanceBetweenPoints, isPointInGameArea, type LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import type { MeasuringLocationCategory } from "@/domain/questions";
import type { TentacleExtendedCategoryId } from "@/domain/questions";
import type { TentaclePoi } from "@/domain/map/annotations";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  isPackGeoPointCategory,
  isPackGeoTentacleCategory,
  PACK_GEO_PACK_IDS,
  packGeoPoiUrl,
} from "@/domain/regions/packGeoManifest";
import type { MeasuringPlace } from "./measuringPlaces";
import {
  sanitizeBundledPoiPlaces,
} from "./bundledPoiHygiene";

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

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase();
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
    const response = await fetch(url);
    if (!response.ok) {
      bundleCache.set(cacheKey, null);
      return null;
    }

    const payload = (await response.json()) as BundledPoiCategory;
    if (!Array.isArray(payload.places)) {
      bundleCache.set(cacheKey, null);
      return null;
    }

    const sanitized: BundledPoiCategory = {
      ...payload,
      places: sanitizeBundledPoiPlaces(payload.places, category),
    };

    bundleCache.set(cacheKey, sanitized);
    return sanitized;
  } catch {
    bundleCache.set(cacheKey, null);
    return null;
  }
}

export function mergeTentaclePois(
  overpassPois: TentaclePoi[],
  bundledPois: TentaclePoi[],
): TentaclePoi[] {
  const seenNames = new Set(
    overpassPois.map((poi) => normalizePlaceName(poi.name)),
  );
  const seenIds = new Set(overpassPois.map((poi) => poi.id));
  const merged = [...overpassPois];

  for (const poi of bundledPois) {
    if (seenIds.has(poi.id)) {
      continue;
    }

    const normalizedName = normalizePlaceName(poi.name);
    if (seenNames.has(normalizedName)) {
      continue;
    }

    seenNames.add(normalizedName);
    seenIds.add(poi.id);
    merged.push(poi);
  }

  return merged;
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
  const seenNames = new Set(
    overpassPlaces.map((place) => normalizePlaceName(place.name)),
  );
  const seenIds = new Set(overpassPlaces.map((place) => place.id));
  const merged = [...overpassPlaces];

  for (const place of bundledPlaces) {
    if (seenIds.has(place.id)) {
      continue;
    }

    const normalizedName = normalizePlaceName(place.name);
    if (seenNames.has(normalizedName)) {
      continue;
    }

    seenNames.add(normalizedName);
    seenIds.add(place.id);
    merged.push(place);
  }

  return merged;
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
