import type { GameArea } from "../../domain/map/annotations";
import { distanceBetweenPoints, isPointInGameArea, type LatLngTuple } from "../../domain/geometry/geometry";
import type { MeasuringLocationCategory } from "../../domain/questions";
import type { TentacleExtendedCategoryId } from "../../domain/questions";
import type { TentaclePoi } from "../../domain/map/annotations";
import type { RegionPackId } from "../../domain/regions/regionPack";
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

const BUNDLED_POI_CATEGORIES = new Set<MeasuringLocationCategory>([
  "commercial_airport",
  "rail_station",
  "mountain",
  "park",
  "museum",
  "hospital",
]);

const TENTACLE_BUNDLED_CATEGORIES = new Set<TentacleExtendedCategoryId>([
  "museum",
  "hospital",
]);

const BUNDLED_POI_PACKS = new Set<RegionPackId>([
  "nyc",
  "london",
  "dublin",
  "portland-maine",
]);

const bundleCache = new Map<string, BundledPoiCategory | null>();

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase();
}

function poiBundleUrl(
  regionPackId: RegionPackId,
  category: string,
): string {
  return `/geo/${regionPackId}/poi/${category}.json`;
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

  const url = poiBundleUrl(regionPackId, category);

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

    bundleCache.set(cacheKey, payload);
    return payload;
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
    !TENTACLE_BUNDLED_CATEGORIES.has(categoryId) ||
    !BUNDLED_POI_CATEGORIES.has(categoryId as MeasuringLocationCategory)
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
    .map((place) => {
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
      } satisfies TentaclePoi;
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
  if (!regionPackId || !BUNDLED_POI_CATEGORIES.has(category)) {
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
