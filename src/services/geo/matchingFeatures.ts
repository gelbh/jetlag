import type { GameArea } from "../../domain/map/annotations";
import type { TransitStation } from "../../domain/session/hidingZone";
import {
  distanceBetweenPoints,
  gameAreaToBoundingBox,
  isPointInGameArea,
  type LatLngTuple,
} from "../../domain/geometry/geometry";
import {
  expandBoundingBox,
  intersectBoundingBoxes,
  type BoundingBox,
} from "../../domain/geometry/gameAreaBounds";
import type { CustomMatchingAreasByLevel } from "../../domain/session/sessionCustomContent";
import type { SessionCustomCategory } from "../../domain/session/sessionCustomContent";
import { customMatchingAreasCacheSuffix } from "./matchingAreaGeoJson";
import {
  adminLevelForMatchingCategory,
  getMatchingCategory,
  matchingCategoryLabel,
  matchingUsesExpandedFeatureSearch,
  type MatchingCategoryId,
} from "../../domain/questions/matchingQuestions";
import {
  matchingOverpassSelectorsForCategory,
  resolveMatchingCategory,
} from "../../domain/session/sessionCustomCatalog";
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
import type { MapViewportBounds } from "../../domain/map/transitViewport";
import { queryOverpass } from "../core/overpassClient";
import {
  buildTransitStopOverpassQuery,
  overpassTransitStopsToMatchingFeatures,
  parseOverpassTransitStops,
  type OverpassTransitStopElement,
} from "../transit/transitStops";
import {
  getOrFetchCached,
  geographicCacheKey,
} from "./geographicFeatureCache";

export interface MatchingFeature {
  id: string;
  name: string;
  point: LatLngTuple;
  inPlayArea?: boolean;
  adminLevel?: number;
  boundary?: GameArea;
}

/** How far beyond the play-area bbox to search for nearest-point categories. */
export const MATCHING_NEAR_FEATURE_SEARCH_BUFFER_METERS = 50_000;

export interface MatchingFetchOptions {
  customMatchingAreas?: CustomMatchingAreasByLevel;
  customCategories?: readonly SessionCustomCategory[];
}

function matchingFeaturesCacheKey(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): string {
  const category =
    resolveMatchingCategory(categoryId, options?.customCategories ?? []) ??
    getMatchingCategory(categoryId);
  const scope = matchingUsesExpandedFeatureSearch(category) ? "near" : "in";
  const adminLevel = adminLevelForMatchingCategory(categoryId);
  const customSuffix =
    adminLevel !== null
      ? customMatchingAreasCacheSuffix(
          options?.customMatchingAreas as Record<number, string> | undefined,
          adminLevel,
        )
      : "";
  return geographicCacheKey(
    gameArea,
    `matching:${scope}:${categoryId}${customSuffix}`,
  );
}

type OverpassElement = {
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

function matchingSearchBoundingBox(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  customCategories: readonly SessionCustomCategory[] = [],
): BoundingBox {
  const bbox = gameAreaToBoundingBox(gameArea);
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);

  if (!matchingUsesExpandedFeatureSearch(category)) {
    return bbox;
  }

  return expandBoundingBox(bbox, MATCHING_NEAR_FEATURE_SEARCH_BUFFER_METERS);
}

function formatOverpassBbox(box: BoundingBox): string {
  return `${box.south},${box.west},${box.north},${box.east}`;
}

function buildMatchingFeaturesQuery(
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  selectors: readonly string[],
  customCategories: readonly SessionCustomCategory[] = [],
): string {
  const bbox = formatOverpassBbox(
    matchingSearchBoundingBox(gameArea, categoryId, customCategories),
  );
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

function matchingFeatureName(tags: Record<string, string>): string | null {
  const candidates = [
    tags.name,
    tags["name:en"],
    tags.official_name,
    tags["official_name:en"],
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function isActiveMatchingFeature(
  tags: Record<string, string> | undefined,
  categoryId: MatchingCategoryId,
): boolean {
  if (!tags) {
    return false;
  }

  const name = matchingFeatureName(tags);
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
  customCategories: readonly SessionCustomCategory[] = [],
): MatchingFeature[] {
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);
  const includeOutsidePlayArea = matchingUsesExpandedFeatureSearch(category);
  const seen = new Set<string>();

  return elements
    .map((element): MatchingFeature | null => {
      if (!isActiveMatchingFeature(element.tags, categoryId)) {
        return null;
      }

      const lat = element.lat ?? element.center?.lat;
      const lng = element.lon ?? element.center?.lon;

      if (lat === undefined || lng === undefined) {
        return null;
      }

      const point: LatLngTuple = [lat, lng];
      const inPlayArea = isPointInGameArea(point, gameArea);
      if (!includeOutsidePlayArea && !inPlayArea) {
        return null;
      }

      const id = String(element.id);
      if (seen.has(id)) {
        return null;
      }

      seen.add(id);

      return {
        id,
        name: matchingFeatureName(element.tags!) ?? "",
        point,
        inPlayArea,
      };
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
  customCategories: readonly SessionCustomCategory[] = [],
): Promise<MatchingFeature[]> {
  const selectors = matchingOverpassSelectorsForCategory(
    categoryId,
    customCategories,
  );
  if (selectors.length === 0) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassElement[] }>(
    buildMatchingFeaturesQuery(gameArea, categoryId, selectors, customCategories),
  );

  return parseMatchingFeatures(
    payload.elements,
    gameArea,
    categoryId,
    customCategories,
  );
}

function buildStreetPathQuery(gameArea: GameArea): string {
  const bbox = formatOverpassBbox(
    matchingSearchBoundingBox(gameArea, "street_or_path"),
  );

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
  return buildTransitStopOverpassQuery(
    matchingSearchBoundingBox(gameArea, "station_name_length"),
  );
}

function overpassStopsToMatchingFeatures(
  elements: readonly OverpassTransitStopElement[],
  gameArea: GameArea,
): MatchingFeature[] {
  return overpassTransitStopsToMatchingFeatures(elements, gameArea).map(
    (station) => ({
      id: station.id,
      name: station.name,
      point: station.point,
      inPlayArea: true,
    }),
  );
}

async function fetchStationFeaturesInArea(
  gameArea: GameArea,
): Promise<MatchingFeature[]> {
  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildStationQuery(gameArea),
  );

  return overpassStopsToMatchingFeatures(payload.elements, gameArea);
}

export async function fetchTransitStationsForHidingZone(
  gameArea: GameArea,
): Promise<TransitStation[]> {
  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildStationQuery(gameArea),
  );

  return parseOverpassTransitStops(payload.elements, gameArea);
}

export async function fetchTransitStationsForHidingZoneViewport(
  viewport: MapViewportBounds,
  gameArea: GameArea,
): Promise<TransitStation[]> {
  const gameAreaBox = gameAreaToBoundingBox(gameArea);
  const clipped = intersectBoundingBoxes(viewport, gameAreaBox);

  if (!clipped) {
    return [];
  }

  const payload = await queryOverpass<{ elements: OverpassTransitStopElement[] }>(
    buildTransitStopOverpassQuery(clipped),
  );

  return parseOverpassTransitStops(payload.elements, gameArea);
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
  customMatchingAreas?: CustomMatchingAreasByLevel,
): Promise<MatchingFeature[]> {
  const adminLevel = adminLevelForMatchingCategory(categoryId);
  if (adminLevel === null) {
    return [];
  }

  const customJson =
    customMatchingAreas?.[adminLevel as keyof CustomMatchingAreasByLevel];

  const divisions = await fetchAdminDivisionFeaturesInArea(
    gameArea,
    adminLevel,
    customJson,
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
  options?: MatchingFetchOptions,
): Promise<MatchingFeature[]> {
  const customCategories = options?.customCategories ?? [];

  return getOrFetchCached(
    matchingFeaturesCacheKey(gameArea, categoryId, options),
    async () => {
      const category =
        resolveMatchingCategory(categoryId, customCategories) ??
        getMatchingCategory(categoryId);

      switch (category.resolver) {
        case "overpassPoint":
          return fetchOverpassMatchingFeaturesInArea(
            gameArea,
            categoryId,
            customCategories,
          );
        case "streetPath":
          return fetchStreetPathFeaturesInArea(gameArea);
        case "stationNameLength":
          return buildStationNameLengthFeatures(
            await fetchStationFeaturesInArea(gameArea),
          );
        case "reverseGeocodeAdmin":
          return fetchAdminMatchingFeaturesInArea(
            gameArea,
            categoryId,
            options?.customMatchingAreas,
          );
        case "landmass":
          return fetchLandmassMatchingFeaturesInArea(gameArea);
        case "transitLine":
          return fetchStationFeaturesInArea(gameArea);
        default: {
          const _exhaustive: never = category.resolver;
          return _exhaustive;
        }
      }
    },
    { persistEmpty: false },
  );
}

export async function findNearestMatchingFeature(
  anchor: LatLngTuple,
  gameArea: GameArea,
  categoryId: MatchingCategoryId,
  options?: MatchingFetchOptions,
): Promise<(MatchingFeature & { distanceMeters: number }) | null> {
  const customCategories = options?.customCategories ?? [];
  const category =
    resolveMatchingCategory(categoryId, customCategories) ??
    getMatchingCategory(categoryId);

  if (category.resolver === "reverseGeocodeAdmin") {
    const adminLevel = adminLevelForMatchingCategory(categoryId);
    if (adminLevel === null) {
      return null;
    }

    const divisions = await fetchAdminDivisionFeaturesInArea(
      gameArea,
      adminLevel,
      options?.customMatchingAreas?.[adminLevel as keyof CustomMatchingAreasByLevel],
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

  const features = await fetchMatchingFeaturesInArea(
    gameArea,
    categoryId,
    options,
  );
  const nearest = pickNearestMatchingFeature(anchor, features);
  return nearest;
}

export function countMatchingFeaturesInPlayArea(
  features: MatchingFeature[],
): number {
  return features.filter((feature) => feature.inPlayArea !== false).length;
}

export function matchingFeatureCountLabel(
  featureCount: number,
  inPlayAreaFeatureCount: number,
  usesContainmentMatching: boolean,
  usesLandmassMatching: boolean,
): string | undefined {
  if (featureCount <= 0) {
    return undefined;
  }

  const noun = usesContainmentMatching
    ? usesLandmassMatching
      ? "landmass"
      : "division"
    : "feature";
  const plural = featureCount === 1 ? "" : "s";
  const nearbyCount = featureCount - inPlayAreaFeatureCount;

  if (usesContainmentMatching || nearbyCount === 0) {
    return `${featureCount} ${noun}${plural} in play area`;
  }

  if (inPlayAreaFeatureCount === 0) {
    return `${featureCount} ${noun}${plural} nearby`;
  }

  return `${featureCount} ${noun}${plural} (${inPlayAreaFeatureCount} in play area, ${nearbyCount} nearby)`;
}

export function matchingFeatureNotFoundMessage(
  categoryId: MatchingCategoryId,
): string {
  const label = matchingCategoryLabel(categoryId).toLowerCase();
  const category = getMatchingCategory(categoryId);

  if (matchingUsesExpandedFeatureSearch(category)) {
    return `No named ${label} found near this play area.`;
  }

  return `No named ${label} found in this play area.`;
}

export function matchingNullAnswerMessage(
  categoryId: MatchingCategoryId,
): string {
  const category = getMatchingCategory(categoryId);
  const label = matchingCategoryLabel(categoryId).toLowerCase();
  const nullSuffix = " You can still answer Yes or No as a null match.";

  if (category.resolver === "landmass") {
    return `No landmass intersects the play area.${nullSuffix}`;
  }

  if (category.resolver === "reverseGeocodeAdmin") {
    return `No ${label} intersects the play area.${nullSuffix}`;
  }

  if (categoryId === "commercial_airport") {
    return `No commercial airport with a flight code was found near this play area.${nullSuffix}`;
  }

  return `No named ${label} found near this play area.${nullSuffix}`;
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
