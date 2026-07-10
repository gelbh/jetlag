import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import type { BoundingBox } from "../../domain/geometry/gameAreaBounds";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameAreaBounds";
import { featureToGameArea } from "../../domain/geometry/geometry";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import type { MatchingAdminLevel } from "../../domain/session/sessionCustomContent";
import {
  DUBLIN_GEO_ASSETS,
  DUBLIN_REGION_PACK_ID,
} from "../../domain/regions/dublinRegionPack";
import type { DublinCouncilFilter, RegionPackId } from "../../domain/regions/regionPack";

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

function councilIdFromFeature(
  feature: Feature<Polygon | MultiPolygon>,
): DublinCouncilFilter | null {
  const councilId = feature.properties?.councilId;
  if (
    councilId === "dcc" ||
    councilId === "fingal" ||
    councilId === "sdcc" ||
    councilId === "dlr"
  ) {
    return councilId;
  }
  return null;
}

function featureToCouncilGameArea(
  feature: Feature<Polygon | MultiPolygon>,
): GameArea {
  if (
    feature.geometry.type !== "Polygon" &&
    feature.geometry.type !== "MultiPolygon"
  ) {
    throw new Error("Council boundary must be a polygon.");
  }

  return featureToGameArea(feature);
}

function combineCouncilGameAreas(
  features: Feature<Polygon | MultiPolygon>[],
): GameArea {
  const polygonSets = features.flatMap((feature) => {
    if (feature.geometry.type === "Polygon") {
      return [feature.geometry.coordinates];
    }
    return feature.geometry.coordinates;
  });

  if (polygonSets.length === 0) {
    throw new Error("No council boundaries found.");
  }

  if (polygonSets.length === 1) {
    return {
      type: "Polygon",
      coordinates: polygonSets[0]!,
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: polygonSets,
  };
}

export async function loadRegionPackPlayArea(
  packId: RegionPackId,
  councilFilter?: DublinCouncilFilter,
): Promise<GameArea> {
  if (packId !== DUBLIN_REGION_PACK_ID) {
    throw new Error(`Unknown region pack: ${packId}`);
  }

  const councilsJson = await fetchGeoJsonText(DUBLIN_GEO_ASSETS.councils);
  const collection = parseFeatureCollection(councilsJson);
  const councilFeatures = collection.features.filter(
    (feature): feature is Feature<Polygon | MultiPolygon> =>
      feature.geometry?.type === "Polygon" ||
      feature.geometry?.type === "MultiPolygon",
  );

  if (councilFilter) {
    const council = councilFeatures.find(
      (feature) => councilIdFromFeature(feature) === councilFilter,
    );
    if (!council) {
      throw new Error(`Couldn't find council boundary for ${councilFilter}.`);
    }
    return featureToCouncilGameArea(council);
  }

  return combineCouncilGameAreas(councilFeatures);
}

export interface RegionPackSessionBoundaries {
  playArea: GameArea;
  focusBounds: BoundingBox;
  customMatchingAreas: CustomMatchingAreasByLevel;
}

export async function loadRegionPackSessionBoundaries(
  packId: RegionPackId,
  councilFilter?: DublinCouncilFilter,
): Promise<RegionPackSessionBoundaries> {
  const councilsJson = await fetchGeoJsonText(DUBLIN_GEO_ASSETS.councils);
  const leasPath = councilFilter
    ? DUBLIN_GEO_ASSETS.leasByCouncil(councilFilter)
    : DUBLIN_GEO_ASSETS.leas;
  const leasJson = await fetchGeoJsonText(leasPath);
  const playArea = await loadRegionPackPlayArea(packId, councilFilter);

  return {
    playArea,
    focusBounds: gameAreaToBoundingBox(playArea),
    customMatchingAreas: {
      8: councilsJson,
      9: leasJson,
    },
  };
}

export async function loadRegionPackMatchingAreas(
  packId: RegionPackId,
  councilFilter?: DublinCouncilFilter,
): Promise<CustomMatchingAreasByLevel> {
  const boundaries = await loadRegionPackSessionBoundaries(packId, councilFilter);
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
