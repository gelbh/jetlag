import type { Feature, MultiPolygon, Polygon } from "geojson";
import { booleanPointInPolygon, intersect, point as turfPoint } from "@turf/turf";
import type { GameArea } from "./annotations";
import type { MatchingAnswer } from "./matchingQuestions";
import {
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  safeDifference,
  type LatLngTuple,
} from "./geometry";
import type { MatchingFeature } from "../services/matchingFeatures";
import {
  matchingFeaturesToAdminDivisions,
  nearestMatchingFeatureIdForPoint,
} from "../services/matchingFeatures";
import {
  buildAdminDivisionBoundaryPreview,
  buildAdminDivisionEliminationRegion,
  findAdminDivisionById,
} from "./adminDivisionGeometry";

const MIN_GRID_STEPS = 24;
const MAX_GRID_STEPS = 48;
const TARGET_CELL_METERS = 750;

function clipToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea);
  const clipped = intersect({
    type: "FeatureCollection",
    features: [gameFeature, feature],
  });

  if (
    !clipped ||
    (clipped.geometry.type !== "Polygon" &&
      clipped.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  return clipped as Feature<Polygon | MultiPolygon>;
}

function gridStepsForGameArea(gameArea: GameArea): {
  latSteps: number;
  lngSteps: number;
} {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const latSpanMeters = (north - south) * 111_320;
  const lngSpanMeters =
    (east - west) *
    111_320 *
    Math.cos((((south + north) / 2) * Math.PI) / 180);

  const latSteps = Math.min(
    MAX_GRID_STEPS,
    Math.max(MIN_GRID_STEPS, Math.ceil(latSpanMeters / TARGET_CELL_METERS)),
  );
  const lngSteps = Math.min(
    MAX_GRID_STEPS,
    Math.max(MIN_GRID_STEPS, Math.ceil(lngSpanMeters / TARGET_CELL_METERS)),
  );

  return { latSteps, lngSteps };
}

function buildSameNearestRegionFromGrid(
  features: MatchingFeature[],
  seekerFeatureId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const { latSteps, lngSteps } = gridStepsForGameArea(gameArea);
  const latStep = (north - south) / latSteps;
  const lngStep = (east - west) / lngSteps;
  const matchingCells: number[][][][] = [];

  for (let latIndex = 0; latIndex < latSteps; latIndex += 1) {
    for (let lngIndex = 0; lngIndex < lngSteps; lngIndex += 1) {
      const cellSouth = south + latIndex * latStep;
      const cellNorth = cellSouth + latStep;
      const cellWest = west + lngIndex * lngStep;
      const cellEast = cellWest + lngStep;
      const center: LatLngTuple = [
        (cellSouth + cellNorth) / 2,
        (cellWest + cellEast) / 2,
      ];

      if (
        !booleanPointInPolygon(turfPoint([center[1], center[0]]), gameAreaToPolygon(gameArea))
      ) {
        continue;
      }

      if (nearestMatchingFeatureIdForPoint(center, features) !== seekerFeatureId) {
        continue;
      }

      matchingCells.push([
        [
          [cellWest, cellSouth],
          [cellEast, cellSouth],
          [cellEast, cellNorth],
          [cellWest, cellNorth],
          [cellWest, cellSouth],
        ],
      ]);
    }
  }

  if (matchingCells.length === 0) {
    return null;
  }

  if (matchingCells.length === 1) {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: matchingCells[0],
      },
    };
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates: matchingCells,
    },
  };
}

export function buildSameNearestRegion(
  features: MatchingFeature[],
  seekerFeatureId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const adminDivisions = matchingFeaturesToAdminDivisions(features);
  if (adminDivisions) {
    const division = findAdminDivisionById(adminDivisions, seekerFeatureId);
    if (!division) {
      return null;
    }

    return buildAdminDivisionBoundaryPreview(division, gameArea);
  }

  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return gameAreaToPolygon(gameArea);
  }

  const region = buildSameNearestRegionFromGrid(
    features,
    seekerFeatureId,
    gameArea,
  );

  if (!region) {
    return null;
  }

  return clipToGameArea(region, gameArea);
}

export function buildMatchingEliminationRegion(
  features: MatchingFeature[],
  seekerFeatureId: string,
  gameArea: GameArea,
  answer: MatchingAnswer,
): Feature<Polygon | MultiPolygon> | null {
  const adminDivisions = matchingFeaturesToAdminDivisions(features);
  if (adminDivisions) {
    const division = findAdminDivisionById(adminDivisions, seekerFeatureId);
    if (!division) {
      return null;
    }

    return buildAdminDivisionEliminationRegion(division, gameArea, answer);
  }

  const sameNearestRegion = buildSameNearestRegion(
    features,
    seekerFeatureId,
    gameArea,
  );

  if (!sameNearestRegion) {
    return null;
  }

  const gameFeature = gameAreaToPolygon(gameArea);

  if (answer === "no") {
    return sameNearestRegion;
  }

  return safeDifference(gameFeature, sameNearestRegion);
}
