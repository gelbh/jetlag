import type { Feature, LineString, Polygon, MultiPolygon } from "geojson";
import type { GameArea } from "../../domain/map/annotations";
import type {
  CustomMatchingAreasByLevel,
  MatchingAdminLevel,
} from "../../domain/session/sessionCustomContent";
import { parseMatchingAreaGeoJson } from "./matchingAreaGeoJson";
import {
  adminLevelForMeasuringBorderKind,
  type AdminDivisionCounts,
} from "./adminDivisionAvailability";

function ringToLineString(ring: number[][]): Feature<LineString> | null {
  if (ring.length < 2) {
    return null;
  }

  const closed =
    ring[0]?.[0] === ring[ring.length - 1]?.[0] &&
    ring[0]?.[1] === ring[ring.length - 1]?.[1];
  const coordinates = closed ? ring : [...ring, ring[0]!];

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };
}

function polygonRingsToLineStrings(
  geometry: Polygon | MultiPolygon,
): Feature<LineString>[] {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  const segments: Feature<LineString>[] = [];
  for (const polygonCoords of polygons) {
    const outerRing = polygonCoords[0];
    if (!outerRing) {
      continue;
    }
    const segment = ringToLineString(outerRing);
    if (segment) {
      segments.push(segment);
    }
  }
  return segments;
}

export function lineStringsFromAdminDivisionBoundaries(
  boundaries: Array<{ boundary: GameArea }>,
): Feature<LineString>[] {
  return boundaries.flatMap((division) => {
    if (division.boundary.type === "Polygon") {
      return polygonRingsToLineStrings({
        type: "Polygon",
        coordinates: division.boundary.coordinates,
      });
    }
    return polygonRingsToLineStrings({
      type: "MultiPolygon",
      coordinates: division.boundary.coordinates,
    });
  });
}

export async function fetchCustomAdminBorderLineSegments(
  gameArea: GameArea,
  kind: "admin1_border" | "admin2_border" | "admin3_border" | "admin4_border",
  customMatchingAreas?: CustomMatchingAreasByLevel,
): Promise<Feature<LineString>[]> {
  const level = adminLevelForMeasuringBorderKind(kind) as MatchingAdminLevel;
  const customJson = customMatchingAreas?.[level];
  if (!customJson) {
    return [];
  }

  const divisions = await parseMatchingAreaGeoJson(customJson, gameArea, level);
  return lineStringsFromAdminDivisionBoundaries(divisions);
}

export function hasEnoughAdminBorderSegments(
  segmentCount: number,
  counts: AdminDivisionCounts | null | undefined,
  kind: "admin3_border" | "admin4_border",
): boolean {
  if (segmentCount < 1) {
    return false;
  }

  if (!counts) {
    return segmentCount >= 2;
  }

  if (kind === "admin3_border") {
    return counts.admin_division_3 >= 2;
  }
  return counts.admin_division_4 >= 2;
}
