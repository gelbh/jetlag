import type { GameArea } from "../domain/annotations";
import {
  distanceBetweenPoints,
  gameAreaToBoundingBox,
  isPointInGameArea,
  type LatLngTuple,
} from "../domain/geometry";
import {
  adminLevelForMatchingCategory,
  getMatchingCategory,
  matchingCategoryLabel,
  matchingCategoryOverpassSelectors,
  type MatchingCategoryId,
} from "../domain/matchingQuestions";
import {
  adminDivisionToMatchingFeature,
  classifyAdminDivisionAtPoint,
  fetchAdminDivisionFeaturesInArea,
  type AdminDivisionFeature,
} from "./adminDivisionBoundaries";
import {
  classifyLandmassAtPoint,
  fetchLandmassFeaturesInArea,
  landmassToMatchingFeature,
} from "./landmassFeatures";
import { queryOverpass } from "./overpassClient";
import {
  getOrFetchCached,
  matchingFeaturesCacheKey,
} from "./geographicFeatureCache";

export interface MatchingFeature {
  id: string;
  name: string;
  point: LatLngTuple;
  adminLevel?: number;
  boundary?: GameArea;
}

type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

function buildMatchingFeaturesQuery(
  gameArea: GameArea,
  selectors: readonly string[],
): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const bbox = `${south},${west},${north},${east}`;
  const clauses = selectors.flatMap((selector) => [
    `node${selector}(${bbox});`,
    `way${selector}(${bbox});`,
    `relation${selector}(${bbox});`,
  ]);

  return `
    [out:json][timeout:25];
  (
    ${clauses.join("\n    ")}
  );
  out center 200;
  `;
}

function isHonoraryConsulate(tags: Record<string, string>): boolean {
  const diplomatic = tags.diplomatic?.toLowerCase() ?? "";
  const office = tags.office?.toLowerCase() ?? "";
  const name = tags.name?.toLowerCase() ?? "";

  return (
    diplomatic.includes("honorary") ||
    office.includes("honorary") ||
    name.includes("honorary")
  );
}

function isMiniatureGolf(tags: Record<string, string>): boolean {
  return tags.miniature === "yes" || tags.golf === "miniature";
}

function isActiveMatchingFeature(
  tags: Record<string, string> | undefined,
  categoryId: MatchingCategoryId,
): boolean {
  if (!tags) {
    return false;
  }

  const name = tags.name?.trim();
  if (!name) {
    return false;
  }

  if (tags.disused === "yes" || tags.abandoned === "yes") {
    return false;
  }

  if (categoryId === "foreign_consulate" && isHonoraryConsulate(tags)) {
    return false;
  }

  if (categoryId === "golf_course" && isMiniatureGolf(tags)) {
    return false;
  }

  return true;
}

export function parseMatchingFeatures(
  elements: OverpassElement[],
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
): MatchingFeature[] {
  const seen = new Set<string>();

  return elements
    .map((element) => {
      if (!isActiveMatchingFeature(element.tags, categoryId)) {
        return null;
      }

      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;

      if (lat === undefined || lng === undefined) {
        return null;
      }

      const point: LatLngTuple = [lat, lng];
      if (!isPointInGameArea(point, gameArea)) {
        return null;
      }

      const id = String(element.id);
      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      return {
        id,
        name: element.tags?.name?.trim() ?? "",
        point,
      } satisfies MatchingFeature;
    })
    .filter((feature): feature is MatchingFeature => feature !== null);
}

export function pickNearestMatchingFeature(
  anchor: LatLngTuple,
  features: MatchingFeature[],
): (MatchingFeature & { distanceMeters: number }) | null {
  let nearest: (MatchingFeature & { distanceMeters: number }) | null = null;

  for (const feature of features) {
    const distanceMeters = distanceBetweenPoints(anchor, feature.point);
    if (
      !nearest ||
      distanceMeters < nearest.distanceMeters ||
      (distanceMeters === nearest.distanceMeters &&
        feature.id.localeCompare(nearest.id) < 0)
    ) {
      nearest = { ...feature, distanceMeters };
    }
  }

  return nearest;
}

export function nearestMatchingFeatureIdForPoint(
  anchor: LatLngTuple,
  features: MatchingFeature[],
): string | null {
  return pickNearestMatchingFeature(anchor, features)?.id ?? null;
}

export function pickMatchingFeatureForAnchor(
  anchor: LatLngTuple,
  features: MatchingFeature[],
  categoryId: MatchingCategoryId,
): (MatchingFeature & { distanceMeters: number }) | null {
  const category = getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin") {
    const divisions = matchingFeaturesToAdminDivisions(features);
    if (!divisions) {
      return null;
    }

    const division = classifyAdminDivisionAtPoint(anchor, divisions);
    if (!division) {
      return null;
    }

    return {
      ...adminDivisionToMatchingFeature(division),
      distanceMeters: 0,
    };
  }

  if (category.resolver === "landmass") {
    const landmasses = matchingFeaturesToBoundedRegions(features);
    if (!landmasses) {
      return null;
    }

    const landmass = classifyLandmassAtPoint(anchor, landmasses);
    if (!landmass) {
      return null;
    }

    return {
      ...landmassToMatchingFeature(landmass),
      distanceMeters: 0,
    };
  }

  return pickNearestMatchingFeature(anchor, features);
}

async function fetchOverpassMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
): Promise<MatchingFeature[]> {
  const selectors = matchingCategoryOverpassSelectors(categoryId);
  if (selectors.length === 0) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildMatchingFeaturesQuery(gameArea, selectors),
  );

  return parseMatchingFeatures(payload.elements, gameArea, categoryId);
}

function buildStreetPathQuery(gameArea: GameArea): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const bbox = `${south},${west},${north},${east}`;

  return `
    [out:json][timeout:25];
  (
    way["highway"]["name"](${bbox});
    way["footway"]["name"](${bbox});
    way["path"]["name"](${bbox});
  );
  out center 200;
  `;
}

async function fetchStreetPathFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildStreetPathQuery(gameArea),
  );

  return parseMatchingFeatures(payload.elements, gameArea, "street_or_path");
}

function buildStationQuery(gameArea: GameArea): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const bbox = `${south},${west},${north},${east}`;

  return `
    [out:json][timeout:25];
  (
    node["railway"~"^(station|halt|stop)$"]["name"](${bbox});
    node["public_transport"="stop_position"]["train"="yes"]["name"](${bbox});
    node["station"="subway"]["name"](${bbox});
    node["station"="light_rail"]["name"](${bbox});
  );
  out center 200;
  `;
}

async function fetchStationFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildStationQuery(gameArea),
  );

  return parseMatchingFeatures(
    payload.elements,
    gameArea,
    "station_name_length",
  );
}

function stationNameLength(name: string): number {
  return name.length;
}

function stationNameLengthFeatureId(name: string): string {
  return `station-name-length:${stationNameLength(name)}`;
}

function stationNameLengthFeatureName(name: string): string {
  return `${stationNameLength(name)} characters (${name})`;
}

function buildStationNameLengthFeatures(
  stations: MatchingFeature[],
): MatchingFeature[] {
  const byLength = new Map<string, MatchingFeature>();

  for (const station of stations) {
    const id = stationNameLengthFeatureId(station.name);
    const existing = byLength.get(id);

    if (!existing || station.name.localeCompare(existing.name) < 0) {
      byLength.set(id, {
        id,
        name: stationNameLengthFeatureName(station.name),
        point: station.point,
      });
    }
  }

  return [...byLength.values()];
}

async function fetchAdminMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
): Promise<MatchingFeature[]> {
  const adminLevel = adminLevelForMatchingCategory(categoryId);
  if (adminLevel === null) {
    return [];
  }

  const divisions = await fetchAdminDivisionFeaturesInArea(
    gameArea,
    adminLevel,
  );
  return divisions.map(adminDivisionToMatchingFeature);
}

export function matchingFeaturesToAdminDivisions(
  features: MatchingFeature[],
): AdminDivisionFeature[] | null {
  if (features.length === 0) {
    return null;
  }

  if (!features.every((feature) => feature.boundary !== undefined)) {
    return null;
  }

  return features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    adminLevel: feature.adminLevel ?? 0,
    boundary: feature.boundary!,
    representativePoint: feature.point,
  }));
}

export function matchingFeaturesToBoundedRegions(
  features: MatchingFeature[],
): AdminDivisionFeature[] | null {
  return matchingFeaturesToAdminDivisions(features);
}

async function fetchLandmassMatchingFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const landmasses = await fetchLandmassFeaturesInArea(gameArea);
  return landmasses.map(landmassToMatchingFeature);
}

export async function fetchMatchingFeaturesInArea(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
): Promise<MatchingFeature[]> {
  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId),
    async () => {
      const category = getMatchingCategory(categoryId);

      switch (category.resolver) {
        case "overpassPoint":
          return fetchOverpassMatchingFeaturesInArea(gameArea, categoryId);
        case "streetPath":
          return fetchStreetPathFeaturesInArea(gameArea);
        case "stationNameLength":
          return buildStationNameLengthFeatures(
            await fetchStationFeaturesInArea(gameArea),
          );
        case "reverseGeocodeAdmin":
          return fetchAdminMatchingFeaturesInArea(gameArea, categoryId);
        case "landmass":
          return fetchLandmassMatchingFeaturesInArea(gameArea);
        case "transitLine":
          return fetchStationFeaturesInArea(gameArea);
        default:
          return [];
      }
    },
  );
}

export async function findNearestMatchingFeature(
  anchor: LatLngTuple,
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
): Promise<(MatchingFeature & { distanceMeters: number }) | null> {
  const category = getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin") {
    const adminLevel = adminLevelForMatchingCategory(categoryId);
    if (adminLevel === null) {
      return null;
    }

    const divisions = await fetchAdminDivisionFeaturesInArea(
      gameArea,
      adminLevel,
    );
    const division = classifyAdminDivisionAtPoint(anchor, divisions);
    if (!division) {
      return null;
    }

    const feature = adminDivisionToMatchingFeature(division);
    return {
      ...feature,
      distanceMeters: 0,
    };
  }

  if (category.resolver === "landmass") {
    const landmasses = await fetchLandmassFeaturesInArea(gameArea);
    const landmass = classifyLandmassAtPoint(anchor, landmasses);
    if (!landmass) {
      return null;
    }

    const feature = landmassToMatchingFeature(landmass);
    return {
      ...feature,
      distanceMeters: 0,
    };
  }

  const features = await fetchMatchingFeaturesInArea(gameArea, categoryId);
  const nearest = pickNearestMatchingFeature(anchor, features);
  return nearest;
}

export function matchingFeatureNotFoundMessage(
  categoryId: MatchingCategoryId,
): string {
  const label = matchingCategoryLabel(categoryId).toLowerCase();
  return `No named ${label} found in this play area.`;
}

export function matchingResolveFailureMessage(
  categoryId: MatchingCategoryId,
  featureCount: number,
): string {
  const category = getMatchingCategory(categoryId);
  const label = matchingCategoryLabel(categoryId).toLowerCase();

  if (featureCount === 0) {
    if (category.resolver === "reverseGeocodeAdmin") {
      return `No named ${label} intersect this play area.`;
    }

    if (category.resolver === "landmass") {
      return "No landmass intersects this play area.";
    }

    return matchingFeatureNotFoundMessage(categoryId);
  }

  if (category.resolver === "reverseGeocodeAdmin") {
    return `Your anchor is not inside any of the ${featureCount} named ${label}${featureCount === 1 ? "" : "s"} loaded for this play area. Try another pin or clarify borders.`;
  }

  if (category.resolver === "landmass") {
    return `Your anchor is not inside any of the ${featureCount} landmass${featureCount === 1 ? "" : "es"} loaded for this play area. Try another pin.`;
  }

  return `No nearest ${label} could be resolved for your anchor.`;
}

export function serializeMatchingFeatures(features: MatchingFeature[]): string {
  return JSON.stringify(features);
}

export function deserializeMatchingFeatures(
  payload: string | undefined,
): MatchingFeature[] {
  if (!payload) {
    return [];
  }

  try {
    const parsed = JSON.parse(payload) as MatchingFeature[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
