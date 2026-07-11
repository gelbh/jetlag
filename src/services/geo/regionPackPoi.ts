import type { GameArea } from "../../domain/map/annotations";
import { isPointInGameArea, type LatLngTuple } from "../../domain/geometry/geometry";
import type { MeasuringLocationCategory } from "../../domain/questions/measuringQuestions";
import {
  isNycRegionPack,
  NYC_GEO_ASSETS,
} from "../../domain/regions/nycRegionPack";
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

const bundleCache = new Map<string, BundledPoiCategory | null>();

function normalizePlaceName(name: string): string {
  return name.trim().toLowerCase();
}

function poiBundleUrl(
  regionPackId: RegionPackId,
  category: MeasuringLocationCategory,
): string | null {
  if (regionPackId === "nyc" && isNycRegionPack(regionPackId)) {
    return NYC_GEO_ASSETS.poi(category);
  }

  return null;
}

async function loadBundledPoiCategory(
  regionPackId: RegionPackId,
  category: MeasuringLocationCategory,
): Promise<BundledPoiCategory | null> {
  const cacheKey = `${regionPackId}:${category}`;
  if (bundleCache.has(cacheKey)) {
    return bundleCache.get(cacheKey) ?? null;
  }

  const url = poiBundleUrl(regionPackId, category);
  if (!url) {
    bundleCache.set(cacheKey, null);
    return null;
  }

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
