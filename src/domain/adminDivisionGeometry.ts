import type { Feature, MultiPolygon, Polygon } from "geojson";
import intersect from "@turf/intersect";
import type { GameArea } from "./annotations";
import type { MatchingAnswer } from "./matchingQuestions";
import { gameAreaToPolygon, safeDifference } from "./geometry";
import type { AdminDivisionFeature } from "../services/adminDivisionBoundaries";

function clipDivisionToGameArea(
  division: AdminDivisionFeature,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  const clipped = intersect({
    type: "FeatureCollection",
    features: [
      gameAreaToPolygon(gameArea),
      gameAreaToPolygon(division.boundary),
    ],
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

export function buildAdminDivisionBoundaryPreview(
  division: AdminDivisionFeature,
  gameArea: GameArea,
): Feature<Polygon | MultiPolygon> | null {
  return clipDivisionToGameArea(division, gameArea);
}

export function buildAdminDivisionEliminationRegion(
  division: AdminDivisionFeature,
  gameArea: GameArea,
  answer: MatchingAnswer,
): Feature<Polygon | MultiPolygon> | null {
  const preview = buildAdminDivisionBoundaryPreview(division, gameArea);
  if (!preview) {
    return null;
  }

  if (answer === "no") {
    return preview;
  }

  return safeDifference(gameAreaToPolygon(gameArea), preview);
}

export function findAdminDivisionById(
  divisions: AdminDivisionFeature[],
  divisionId: string,
): AdminDivisionFeature | null {
  return divisions.find((division) => division.id === divisionId) ?? null;
}
