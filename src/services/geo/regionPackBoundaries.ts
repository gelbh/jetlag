import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import type { BoundingBox } from "../../domain/geometry/gameAreaBounds";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameAreaBounds";
import { featureToGameArea } from "../../domain/geometry/geometry";
import { gameAreaWithoutInteriorRings } from "../../domain/geometry/geometryCore";
import { unionGameAreas } from "../../domain/geometry/unionGameAreas";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import type { MatchingAdminLevel } from "../../domain/session/sessionCustomContent";
import {
  getRegionPackConfig,
  isKnownRegionPack,
} from "../../domain/regions/regionPackRegistry";
import type { RegionPackId } from "../../domain/regions/regionPack";

const regionPackGeoCache = new Map<string, string>();

async function fetchGeoJsonText(path: string): Promise<string> {
  const cached = regionPackGeoCache.get(path);
  if (cached) {
    return cached;
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Couldn't load region boundary data (${response.status}).`);
  }

  const text = await response.text();
  regionPackGeoCache.set(path, text);
  return text;
}

export function clearRegionPackGeoCacheForTests(): void {
  regionPackGeoCache.clear();
}

function parseFeatureCollection(text: string): FeatureCollection {
  const parsed = JSON.parse(text) as FeatureCollection;
  if (parsed.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
    throw new Error("Expected a GeoJSON FeatureCollection.");
  }
  return parsed;
}

function polygonFeatures(
  collection: FeatureCollection,
): Feature<Polygon | MultiPolygon>[] {
  return collection.features.filter(
    (feature): feature is Feature<Polygon | MultiPolygon> =>
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon",
  );
}

function subregionIdFromFeature(
  feature: Feature<Polygon | MultiPolygon>,
  propertyKey: string,
): string | null {
  const value = feature.properties?.[propertyKey];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function featureToRegionGameArea(
  feature: Feature<Polygon | MultiPolygon>,
): GameArea {
  if (
    feature.geometry.type !== "Polygon" &&
    feature.geometry.type !== "MultiPolygon"
  ) {
    throw new Error("Region boundary must be a polygon.");
  }

  return featureToGameArea(feature);
}

function combineRegionGameAreas(
  features: Feature<Polygon | MultiPolygon>[],
): GameArea {
  if (features.length === 0) {
    throw new Error("No region boundaries found.");
  }

  if (features.length === 1) {
    return gameAreaWithoutInteriorRings(featureToRegionGameArea(features[0]!));
  }

  return unionGameAreas(
    features.map((feature) => featureToRegionGameArea(feature)),
  );
}

export async function loadRegionPackPlayArea(
  packId: RegionPackId,
  subregionId?: string,
): Promise<GameArea> {
  const config = getRegionPackConfig(packId);
  if (!config) {
    throw new Error(`Unknown region pack: ${packId}`);
  }

  if (!subregionId && config.geoAssets.playArea) {
    const playAreaJson = await fetchGeoJsonText(config.geoAssets.playArea);
    const collection = parseFeatureCollection(playAreaJson);
    return combineRegionGameAreas(polygonFeatures(collection));
  }

  if (!subregionId && config.playAreaLevel === "secondary") {
    const secondaryJson = await fetchGeoJsonText(config.geoAssets.secondary);
    const collection = parseFeatureCollection(secondaryJson);
    return combineRegionGameAreas(polygonFeatures(collection));
  }

  const primaryJson = await fetchGeoJsonText(config.geoAssets.primary);
  const collection = parseFeatureCollection(primaryJson);
  const primaryFeatures = polygonFeatures(collection);

  if (subregionId) {
    const subregion = primaryFeatures.find(
      (feature) =>
        subregionIdFromFeature(feature, config.subregionPropertyKey) ===
        subregionId,
    );
    if (!subregion) {
      throw new Error(`Couldn't find region boundary for ${subregionId}.`);
    }
    return featureToRegionGameArea(subregion);
  }

  return combineRegionGameAreas(primaryFeatures);
}

export interface RegionPackSessionBoundaries {
  playArea: GameArea;
  focusBounds: BoundingBox;
  customMatchingAreas: CustomMatchingAreasByLevel;
}

export async function loadRegionPackSessionBoundaries(
  packId: RegionPackId,
  subregionId?: string,
): Promise<RegionPackSessionBoundaries> {
  const config = getRegionPackConfig(packId);
  if (!config) {
    throw new Error(`Unknown region pack: ${packId}`);
  }

  const primaryJson = await fetchGeoJsonText(config.geoAssets.primary);
  const secondaryPath = subregionId && config.geoAssets.secondaryBySubregion
    ? config.geoAssets.secondaryBySubregion(subregionId)
    : config.geoAssets.secondary;
  const secondaryJson = await fetchGeoJsonText(secondaryPath);
  const playArea = await loadRegionPackPlayArea(packId, subregionId);

  return {
    playArea,
    focusBounds: gameAreaToBoundingBox(playArea),
    customMatchingAreas: {
      8: primaryJson,
      9: secondaryJson,
    },
  };
}

export async function loadRegionPackMatchingAreas(
  packId: RegionPackId,
  subregionId?: string,
): Promise<CustomMatchingAreasByLevel> {
  const boundaries = await loadRegionPackSessionBoundaries(packId, subregionId);
  return boundaries.customMatchingAreas;
}

export function adminLevelForRegionPackAsset(
  level: keyof CustomMatchingAreasByLevel,
): MatchingAdminLevel | null {
  if (level === 8 || level === 9) {
    return level;
  }
  return null;
}

export function regionPackHasBundledBoundaries(
  regionPackId: RegionPackId | undefined,
): boolean {
  return isKnownRegionPack(regionPackId);
}
