import type { Feature, MultiPolygon, Polygon } from "geojson";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import type { GameArea } from "./annotations";
import type { MatchingAnswer } from "./matchingQuestions";
import { geoSpatialVoronoiFromSites } from "./geoSpatialVoronoi";
import { voronoiCellSiteId } from "./voronoiCellSiteId";
import {
  gameAreaToPolygon,
  safeDifference,
} from "./geometry";
import type { MatchingFeature } from "../services/matchingFeatures";
import { matchingFeaturesToAdminDivisions } from "../services/matchingFeatures";
import {
  buildAdminDivisionBoundaryPreview,
  buildAdminDivisionEliminationRegion,
  findAdminDivisionById,
} from "./adminDivisionGeometry";

const SIMPLIFY_TOLERANCE = 0.000012;

function clipToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea);
  try {
    const clipped = intersect({
      type: "FeatureCollection",
      features: [gameFeature, feature],
    });

    if (
      clipped &&
      (clipped.geometry.type === "Polygon" ||
        clipped.geometry.type === "MultiPolygon")
    ) {
      return clipped as Feature<Polygon | MultiPolygon>;
    }
  } catch {
    /* polyclip / intersect can throw on complex polygons */
  }

  return null;
}

function buildSameNearestRegionFromVoronoi(
  features: MatchingFeature[],
  seekerFeatureId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const cells = geoSpatialVoronoiFromSites(
    features.map((feature) => ({
      lng: feature.point[1],
      lat: feature.point[0],
      properties: { featureId: feature.id },
    })),
  );

  const seekerCell = cells.features.find(
    (cell) => voronoiCellSiteId(cell, ["featureId"]) === seekerFeatureId,
  );

  if (
    !seekerCell ||
    (seekerCell.geometry.type !== "Polygon" &&
      seekerCell.geometry.type !== "MultiPolygon")
  ) {
    return null;
  }

  const clipped = clipToGameArea(
    seekerCell as Feature<Polygon | MultiPolygon>,
    gameArea,
  );
  if (!clipped) {
    return null;
  }

  try {
    return simplify(clipped, {
      tolerance: SIMPLIFY_TOLERANCE,
      highQuality: true,
    }) as Feature<Polygon | MultiPolygon>;
  } catch {
    return clipped;
  }
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

  return buildSameNearestRegionFromVoronoi(
    features,
    seekerFeatureId,
    gameArea,
  );
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
