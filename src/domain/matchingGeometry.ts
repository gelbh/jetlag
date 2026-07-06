import type { Feature, MultiPolygon, Polygon } from "geojson";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import intersect from "@turf/intersect";
import simplify from "@turf/simplify";
import voronoi from "@turf/voronoi";
import type { GameArea } from "./annotations";
import type { MatchingAnswer } from "./matchingQuestions";
import {
  gameAreaToBoundingBox,
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

const VORONOI_BBOX_MARGIN_DEG = 0.0004;
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

function matchingVoronoiBbox(
  features: MatchingFeature[],
  gameArea: GameArea,
): [number, number, number, number] {
  const gameBb = gameAreaToBoundingBox(gameArea);
  let south = gameBb.south - VORONOI_BBOX_MARGIN_DEG;
  let north = gameBb.north + VORONOI_BBOX_MARGIN_DEG;
  let west = gameBb.west - VORONOI_BBOX_MARGIN_DEG;
  let east = gameBb.east + VORONOI_BBOX_MARGIN_DEG;

  for (const feature of features) {
    const [lat, lng] = feature.point;
    south = Math.min(south, lat - VORONOI_BBOX_MARGIN_DEG);
    north = Math.max(north, lat + VORONOI_BBOX_MARGIN_DEG);
    west = Math.min(west, lng - VORONOI_BBOX_MARGIN_DEG);
    east = Math.max(east, lng + VORONOI_BBOX_MARGIN_DEG);
  }

  if (south >= north || west >= east) {
    return [gameBb.west, gameBb.south, gameBb.east, gameBb.north];
  }

  return [west, south, east, north];
}

function buildSameNearestRegionFromVoronoi(
  features: MatchingFeature[],
  seekerFeatureId: string,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const bbox = matchingVoronoiBbox(features, gameArea);
  const sites = featureCollection(
    features.map((feature) =>
      turfPoint([feature.point[1], feature.point[0]], {
        featureId: feature.id,
      }),
    ),
  );

  let cells;
  try {
    cells = voronoi(sites, { bbox });
  } catch {
    return null;
  }

  const seekerCell = cells.features.find(
    (cell) =>
      (cell.properties as { featureId?: string } | null)?.featureId ===
      seekerFeatureId,
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
