import area from "@turf/area";
import booleanIntersects from "@turf/boolean-intersects";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { lineString, point as turfPoint } from "@turf/helpers";
import polygonize from "@turf/polygonize";
import type { Feature, LineString } from "geojson";
import type { AdminDivisionFeature } from "@/domain/geo/types";
import type { LatLngTuple } from "@/domain/geometry/gameArea/geometry";
import {
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  simplifyGameArea,
} from "@/domain/geometry/gameArea/geometry";
import type { GameArea } from "@/domain/map/annotations";
import { adminDivisionCacheKey, getOrFetchCached } from "../cache";
import { parseMatchingAreaGeoJson } from "../matching/matchingAreaGeoJson";
import { mergeOverpassElementPayloads, type OverpassBbox } from "./overpassBboxSplit";
import {
  cachedFetchOptions,
  type OverpassLoad,
  overpassLoadFromFetch,
  overpassSearchStage,
  queryOverpassSplitLoaded,
} from "./overpassLoad";

export type { AdminDivisionFeature } from "@/domain/geo/types";

type OverpassMember = {
  type: "way" | "node" | "relation";
  ref: number;
  role?: string;
};

type OverpassGeometryNode = {
  lat: number;
  lon: number;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  members?: OverpassMember[];
  geometry?: OverpassGeometryNode[];
  center?: { lat: number; lon: number };
  lat?: number;
  lon?: number;
};

function isActiveAdminRelation(tags: Record<string, string> | undefined): boolean {
  if (!tags) {
    return false;
  }

  const name = tags.name?.trim();
  if (!name) {
    return false;
  }

  if (tags.boundary !== "administrative") {
    return false;
  }

  if (tags.disused === "yes" || tags.abandoned === "yes") {
    return false;
  }

  return true;
}

function wayGeometryToLineString(
  geometry: OverpassGeometryNode[] | undefined,
): Feature<LineString> | null {
  if (!geometry || geometry.length < 2) {
    return null;
  }

  return lineString(geometry.map((node) => [node.lon, node.lat]));
}

function closeRing(ring: number[][]): number[][] {
  if (ring.length === 0) {
    return ring;
  }

  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }

  return [...ring, first];
}

function lineStringToRing(line: Feature<LineString>): number[][] | null {
  const coordinates = line.geometry.coordinates;
  if (coordinates.length < 4) {
    return null;
  }

  return closeRing(coordinates);
}

function ringsToGameArea(rings: number[][][]): GameArea | null {
  if (rings.length === 0) {
    return null;
  }

  if (rings.length === 1) {
    return {
      type: "Polygon",
      coordinates: [rings[0]],
    };
  }

  return {
    type: "MultiPolygon",
    coordinates: rings.map((ring) => [ring]),
  };
}

export function relationBoundaryFromElements(
  relation: OverpassElement,
  waysById: Map<number, OverpassElement>,
): GameArea | null {
  const outerWayIds =
    relation.members
      ?.filter(
        (member) =>
          member.type === "way" && (member.role === "outer" || member.role === "" || !member.role),
      )
      .map((member) => member.ref) ?? [];

  if (outerWayIds.length === 0) {
    return null;
  }

  const lines: Feature<LineString>[] = [];

  for (const wayId of outerWayIds) {
    const way = waysById.get(wayId);
    const line = wayGeometryToLineString(way?.geometry);
    if (line) {
      lines.push(line);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  if (lines.length === 1) {
    const ring = lineStringToRing(lines[0]);
    return ring ? ringsToGameArea([ring]) : null;
  }

  const polygonized = polygonize({
    type: "FeatureCollection",
    features: lines,
  });

  const rings = polygonized.features
    .map((feature) => {
      if (feature.geometry.type !== "Polygon") {
        return null;
      }

      return feature.geometry.coordinates[0] ?? null;
    })
    .filter((ring): ring is number[][] => ring !== null);

  return ringsToGameArea(rings);
}

export function representativePointForBoundary(boundary: GameArea): LatLngTuple {
  const feature = gameAreaToPolygon(boundary);
  const rings =
    feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;

  const largestRing = rings
    .map((polygon) => polygon[0])
    .filter((ring): ring is number[][] => Boolean(ring && ring.length >= 3))
    .sort(
      (left, right) =>
        area({
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [right] },
        }) -
        area({
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [left] },
        }),
    )[0];

  if (!largestRing) {
    return [0, 0];
  }

  let twiceArea = 0;
  let centroidLng = 0;
  let centroidLat = 0;
  for (let index = 0; index < largestRing.length - 1; index += 1) {
    const [lng, lat] = largestRing[index];
    const [nextLng, nextLat] = largestRing[index + 1];
    const cross = lng * nextLat - nextLng * lat;
    twiceArea += cross;
    centroidLng += (lng + nextLng) * cross;
    centroidLat += (lat + nextLat) * cross;
  }

  if (twiceArea !== 0) {
    const centroid: LatLngTuple = [centroidLat / (3 * twiceArea), centroidLng / (3 * twiceArea)];
    if (booleanPointInPolygon(turfPoint([centroid[1], centroid[0]]), feature)) {
      return centroid;
    }
  }

  // A boundary midpoint is on the surface even when the centroid falls outside
  // a concave polygon. Use the longest edge for a stable label location.
  let longestEdge = largestRing.slice(0, 2);
  let longestLength = -1;
  for (let index = 0; index < largestRing.length - 1; index += 1) {
    const edge = [largestRing[index], largestRing[index + 1]];
    const [lng, lat] = edge[0];
    const [nextLng, nextLat] = edge[1];
    const length = (nextLng - lng) ** 2 + (nextLat - lat) ** 2;
    if (length > longestLength) {
      longestLength = length;
      longestEdge = edge;
    }
  }

  const [lng, lat] = longestEdge[0];
  const [nextLng, nextLat] = longestEdge[1];
  return [(lat + nextLat) / 2, (lng + nextLng) / 2];
}

function intersectsGameArea(boundary: GameArea, gameArea: GameArea): boolean {
  return booleanIntersects(gameAreaToPolygon(boundary), gameAreaToPolygon(gameArea));
}

export function parseAdminDivisionFeatures(
  elements: OverpassElement[],
  gameArea: GameArea,
  adminLevel: number,
): AdminDivisionFeature[] {
  const waysById = new Map<number, OverpassElement>();
  for (const element of elements) {
    if (element.type === "way") {
      waysById.set(element.id, element);
    }
  }

  const divisions: AdminDivisionFeature[] = [];

  for (const element of elements) {
    if (element.type !== "relation") {
      continue;
    }

    if (!isActiveAdminRelation(element.tags)) {
      continue;
    }

    if (element.tags?.admin_level !== String(adminLevel)) {
      continue;
    }

    const boundary = relationBoundaryFromElements(element, waysById);
    if (!boundary) {
      continue;
    }

    const simplified = simplifyGameArea(boundary);
    if (!intersectsGameArea(simplified, gameArea)) {
      continue;
    }

    divisions.push({
      id: `relation/${element.id}`,
      name: element.tags?.name?.trim() ?? "",
      adminLevel,
      boundary: simplified,
      representativePoint: representativePointForBoundary(simplified),
    });
  }

  return divisions.sort((left, right) => left.id.localeCompare(right.id));
}

export function buildAdminDivisionQueryForBbox(bbox: OverpassBbox, adminLevel: number): string {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  // Explicit bbox — `area.searchArea` was never populated, so admin queries
  // returned zero relations in production.
  return `
    [out:json][timeout:25];
    (
      relation["boundary"="administrative"]["admin_level"="${adminLevel}"]["name"](${bboxStr});
    );
    out center;
    >;
    out geom qt;
  `;
}

export function buildAdminDivisionQuery(gameArea: GameArea, adminLevel: number): string {
  return buildAdminDivisionQueryForBbox(gameAreaToBoundingBox(gameArea), adminLevel);
}

export async function fetchAdminDivisionFeaturesInArea(
  gameArea: GameArea,
  adminLevel: number,
  customAreasJson?: string,
  load?: OverpassLoad,
): Promise<AdminDivisionFeature[]> {
  if (customAreasJson) {
    load?.node?.finish();
    return parseMatchingAreaGeoJson(customAreasJson, gameArea, adminLevel);
  }

  const bbox = gameAreaToBoundingBox(gameArea);
  return getOrFetchCached(
    adminDivisionCacheKey(gameArea, adminLevel),
    async (context) => {
      const payload = await queryOverpassSplitLoaded<{ elements: OverpassElement[] }>(
        (child) => buildAdminDivisionQueryForBbox(child, adminLevel),
        bbox,
        mergeOverpassElementPayloads,
        overpassLoadFromFetch(context),
      );

      return parseAdminDivisionFeatures(payload.elements, gameArea, adminLevel);
    },
    cachedFetchOptions(load, {
      ...overpassSearchStage("overpass:admin-geom", bbox),
      label: "Loading area boundaries",
    }),
  );
}

export function adminDivisionAreaSquareMeters(boundary: GameArea): number {
  return area(gameAreaToPolygon(boundary));
}

export function pointInAdminDivision(point: LatLngTuple, division: AdminDivisionFeature): boolean {
  return booleanPointInPolygon(
    turfPoint([point[1], point[0]]),
    gameAreaToPolygon(division.boundary),
  );
}

export function classifyAdminDivisionAtPoint(
  point: LatLngTuple,
  divisions: AdminDivisionFeature[],
): AdminDivisionFeature | null {
  const containing = divisions
    .filter((division) => pointInAdminDivision(point, division))
    .map((division) => ({
      division,
      areaSquareMeters: adminDivisionAreaSquareMeters(division.boundary),
    }));

  if (containing.length === 0) {
    return null;
  }

  containing.sort((left, right) => {
    const areaDelta = left.areaSquareMeters - right.areaSquareMeters;
    if (areaDelta !== 0) {
      return areaDelta;
    }

    return left.division.id.localeCompare(right.division.id);
  });

  return containing[0]?.division ?? null;
}
