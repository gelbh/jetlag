import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import area from "@turf/area";
import booleanIntersects from "@turf/boolean-intersects";
import type { GameArea } from "../domain/annotations";
import { gameAreaToBoundingBox } from "../domain/gameAreaBounds";
import {
  featureToGameArea,
  gameAreaToPolygon,
  simplifyGameArea,
  type LatLngTuple,
} from "../domain/geometry";
import type { AdminDivisionFeature } from "./adminDivisionBoundaries";
import { MAX_ADMIN_DIVISIONS } from "./adminDivisionBoundaries";

function representativePointFromBoundary(boundary: GameArea): LatLngTuple {
  const box = gameAreaToBoundingBox(boundary);
  return [(box.north + box.south) / 2, (box.east + box.west) / 2];
}

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function parseMatchingAreaGeoJson(
  text: string,
  gameArea: GameArea,
  adminLevel: number,
): AdminDivisionFeature[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as FeatureCollection).type !== "FeatureCollection" ||
    !Array.isArray((parsed as FeatureCollection).features)
  ) {
    throw new Error("Expected a GeoJSON FeatureCollection.");
  }

  const collection = parsed as FeatureCollection;
  const playAreaPolygon = gameAreaToPolygon(gameArea);
  const divisions: AdminDivisionFeature[] = [];
  const usedIds = new Set<string>();

  for (const feature of collection.features) {
    if (!feature.geometry) {
      continue;
    }

    if (
      feature.geometry.type !== "Polygon" &&
      feature.geometry.type !== "MultiPolygon"
    ) {
      continue;
    }

    const name =
      typeof feature.properties?.name === "string"
        ? feature.properties.name.trim()
        : "";

    if (!name) {
      continue;
    }

    const boundary = simplifyGameArea(
      featureToGameArea(
        feature as Feature<Polygon | MultiPolygon>,
      ),
    );

    if (
      !booleanIntersects(gameAreaToPolygon(boundary), playAreaPolygon) ||
      area(gameAreaToPolygon(boundary)) <= 0
    ) {
      continue;
    }

    let id =
      typeof feature.properties?.id === "string"
        ? feature.properties.id
        : `custom:${slugifyName(name)}`;

    if (usedIds.has(id)) {
      id = `${id}-${divisions.length + 1}`;
    }
    usedIds.add(id);

    divisions.push({
      id,
      name,
      adminLevel,
      boundary,
      representativePoint: representativePointFromBoundary(boundary),
    });
  }

  if (divisions.length === 0) {
    throw new Error("No named polygon features intersect the play area.");
  }

  if (divisions.length > MAX_ADMIN_DIVISIONS) {
    return divisions
      .sort((left, right) => area(gameAreaToPolygon(left.boundary)) - area(gameAreaToPolygon(right.boundary)))
      .slice(0, MAX_ADMIN_DIVISIONS);
  }

  return divisions.sort((left, right) => left.name.localeCompare(right.name));
}

export function customMatchingAreasCacheSuffix(
  customMatchingAreas: Record<number, string> | undefined,
  adminLevel: number,
): string {
  const raw = customMatchingAreas?.[adminLevel as keyof typeof customMatchingAreas];
  if (!raw) {
    return "";
  }

  return `:custom:${adminLevel}:${raw.length}`;
}

export function boundingBoxFromGameArea(gameArea: GameArea) {
  return gameAreaToBoundingBox(gameArea);
}
