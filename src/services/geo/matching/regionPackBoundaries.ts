import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { BoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import { gameAreaToBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import { featureToGameArea } from "@/domain/geometry/gameArea/geometry";
import { gameAreaWithoutInteriorRings } from "@/domain/geometry/gameArea/geometryCore";
import { unionGameAreas } from "@/domain/geometry/masks/unionGameAreas";
import type { GameArea } from "@/domain/map/annotations";
import type { ProgressNode, StageSpec } from "@/domain/progress/progressTree";
import type { RegionPackId } from "@/domain/regions/regionPack";
import {
  getRegionPackConfig,
  isKnownRegionPack,
  type RegionPackConfig,
} from "@/domain/regions/regionPackRegistry";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "@/domain/session/catalog/sessionCustomContent";
import {
  fetchAndReadWithTimeout,
  GEO_FETCH_TIMEOUT_MS,
  readTextWithProgress,
} from "@/services/core/network/fetchWithTimeout";
import { withStage } from "@/services/core/progress/loadTask";
import { yieldToMain } from "@/services/core/progress/yieldToMain";

const regionPackGeoCache = new Map<string, string>();

const DOWNLOAD_STAGE: StageSpec = {
  kind: "download",
  label: "Downloading boundaries",
  historyKey: "bundle:boundaries",
};

const PLAY_AREA_STAGE: StageSpec = {
  kind: "compute",
  label: "Building play area",
  historyKey: "compute:pack-play-area",
};

type DownloadStages = ReadonlyMap<string, ProgressNode>;

/**
 * One download stage per asset not yet cached, all created before the first
 * fetch so the bar's weights do not shift partway through.
 */
function planDownloadStages(
  paths: readonly (string | undefined)[],
  progress: ProgressNode | undefined,
): DownloadStages {
  const stages = new Map<string, ProgressNode>();
  if (!progress) {
    return stages;
  }
  const pending = [...new Set(paths.filter((path): path is string => Boolean(path)))].filter(
    (path) => !regionPackGeoCache.has(path),
  );
  pending.forEach((path, index) => {
    const label =
      pending.length > 1
        ? `${DOWNLOAD_STAGE.label} (${index + 1} of ${pending.length})`
        : DOWNLOAD_STAGE.label;
    stages.set(path, progress.stage({ ...DOWNLOAD_STAGE, label }));
  });
  return stages;
}

function resolveGeoAssetUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).href;
  }
  return path;
}

async function fetchGeoJsonText(path: string, stages?: DownloadStages): Promise<string> {
  const node = stages?.get(path);
  const cached = regionPackGeoCache.get(path);
  if (cached) {
    node?.finish();
    return cached;
  }

  const text = await fetchAndReadWithTimeout(
    resolveGeoAssetUrl(path),
    undefined,
    GEO_FETCH_TIMEOUT_MS,
    async (response) => {
      if (!response.ok) {
        throw new Error(`Couldn't load region boundary data (${response.status}).`);
      }
      return readTextWithProgress(response, node);
    },
  );
  node?.finish();
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

function polygonFeatures(collection: FeatureCollection): Feature<Polygon | MultiPolygon>[] {
  return collection.features.filter(
    (feature): feature is Feature<Polygon | MultiPolygon> =>
      feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon",
  );
}

function subregionIdFromFeature(
  feature: Feature<Polygon | MultiPolygon>,
  propertyKey: string,
): string | null {
  const value = feature.properties?.[propertyKey];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function featureToRegionGameArea(feature: Feature<Polygon | MultiPolygon>): GameArea {
  if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") {
    throw new Error("Region boundary must be a polygon.");
  }

  return featureToGameArea(feature);
}

function combineRegionGameAreas(features: Feature<Polygon | MultiPolygon>[]): GameArea {
  if (features.length === 0) {
    throw new Error("No region boundaries found.");
  }

  if (features.length === 1) {
    return gameAreaWithoutInteriorRings(featureToRegionGameArea(features[0]!));
  }

  return unionGameAreas(features.map((feature) => featureToRegionGameArea(feature)));
}

function primaryAssetPath(config: RegionPackConfig, subregionId?: string): string {
  return subregionId && config.geoAssets.primaryBySubregion
    ? config.geoAssets.primaryBySubregion(subregionId)
    : config.geoAssets.primary;
}

function playAreaAssetPath(
  packId: RegionPackId,
  config: RegionPackConfig,
  subregionId?: string,
): string {
  if (!subregionId && config.geoAssets.playArea) {
    return config.geoAssets.playArea;
  }
  if (!subregionId && config.playAreaLevel === "secondary") {
    if (!config.geoAssets.secondary) {
      throw new Error(
        `Region pack ${packId} playAreaLevel is secondary but has no secondary asset.`,
      );
    }
    return config.geoAssets.secondary;
  }
  return primaryAssetPath(config, subregionId);
}

async function buildPlayArea(
  path: string,
  config: RegionPackConfig,
  subregionId: string | undefined,
  stages: DownloadStages,
  progress: ProgressNode | undefined,
): Promise<GameArea> {
  const text = await fetchGeoJsonText(path, stages);
  return withStage(progress, PLAY_AREA_STAGE, async () => {
    // Let "Building play area" paint before the synchronous union.
    await yieldToMain();
    const features = polygonFeatures(parseFeatureCollection(text));
    if (!subregionId) {
      return combineRegionGameAreas(features);
    }
    const subregion = features.find(
      (feature) => subregionIdFromFeature(feature, config.subregionPropertyKey) === subregionId,
    );
    if (!subregion) {
      throw new Error(`Couldn't find region boundary for ${subregionId}.`);
    }
    return featureToRegionGameArea(subregion);
  });
}

/** `progress` gets a byte-counted download stage per uncached asset, then the build. */
export async function loadRegionPackPlayArea(
  packId: RegionPackId,
  subregionId?: string,
  progress?: ProgressNode,
): Promise<GameArea> {
  const config = getRegionPackConfig(packId);
  if (!config) {
    throw new Error(`Unknown region pack: ${packId}`);
  }

  const path = playAreaAssetPath(packId, config, subregionId);
  const stages = planDownloadStages([path], progress);
  return buildPlayArea(path, config, subregionId, stages, progress);
}

export interface RegionPackSessionBoundaries {
  playArea: GameArea;
  focusBounds: BoundingBox;
  customMatchingAreas: CustomMatchingAreasByLevel;
}

function filterGeoJsonTextBySubregion(
  text: string,
  propertyKey: string,
  subregionId: string,
): string {
  const collection = parseFeatureCollection(text);
  const filtered: FeatureCollection = {
    type: "FeatureCollection",
    features: collection.features.filter((feature) => {
      const value = feature.properties?.[propertyKey];
      return typeof value === "string" && value === subregionId;
    }),
  };
  return JSON.stringify(filtered);
}

/** `progress` gets a byte-counted download stage per uncached asset, then the play area build. */
export async function loadRegionPackSessionBoundaries(
  packId: RegionPackId,
  subregionId?: string,
  progress?: ProgressNode,
): Promise<RegionPackSessionBoundaries> {
  const config = getRegionPackConfig(packId);
  if (!config) {
    throw new Error(`Unknown region pack: ${packId}`);
  }

  const primaryPath = primaryAssetPath(config, subregionId);
  const secondaryPath =
    subregionId && config.geoAssets.secondaryBySubregion
      ? config.geoAssets.secondaryBySubregion(subregionId)
      : config.geoAssets.secondary;
  const level4Path =
    subregionId && config.geoAssets.matchingLevel4BySubregion
      ? config.geoAssets.matchingLevel4BySubregion(subregionId)
      : config.geoAssets.matchingLevel4;
  const level6Path =
    subregionId && config.geoAssets.matchingLevel6BySubregion
      ? config.geoAssets.matchingLevel6BySubregion(subregionId)
      : config.geoAssets.matchingLevel6;
  const playAreaPath = playAreaAssetPath(packId, config, subregionId);
  const stages = planDownloadStages(
    [primaryPath, secondaryPath, level4Path, level6Path, playAreaPath],
    progress,
  );

  let primaryJson = await fetchGeoJsonText(primaryPath, stages);
  if (!config.geoAssets.primaryBySubregion && packId === "australia" && subregionId !== undefined) {
    primaryJson = filterGeoJsonTextBySubregion(
      primaryJson,
      config.subregionPropertyKey,
      subregionId,
    );
  }
  const secondaryJson = secondaryPath ? await fetchGeoJsonText(secondaryPath, stages) : undefined;

  let level4Json: string | undefined;
  if (level4Path) {
    const raw = await fetchGeoJsonText(level4Path, stages);
    level4Json =
      !config.geoAssets.matchingLevel4BySubregion && subregionId !== undefined
        ? filterGeoJsonTextBySubregion(raw, config.subregionPropertyKey, subregionId)
        : raw;
  }

  const level6Json = level6Path ? await fetchGeoJsonText(level6Path, stages) : undefined;

  const playArea = await buildPlayArea(playAreaPath, config, subregionId, stages, progress);

  return {
    playArea,
    focusBounds: gameAreaToBoundingBox(playArea),
    customMatchingAreas: {
      ...(level4Json !== undefined ? { 4: level4Json } : {}),
      ...(level6Json !== undefined ? { 6: level6Json } : {}),
      8: primaryJson,
      ...(secondaryJson !== undefined ? { 9: secondaryJson } : {}),
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
  if (level === 4 || level === 6 || level === 8 || level === 9) {
    return level;
  }
  return null;
}

export function regionPackHasBundledBoundaries(regionPackId: RegionPackId | undefined): boolean {
  return isKnownRegionPack(regionPackId);
}
