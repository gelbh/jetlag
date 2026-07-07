import type { Feature, LineString, MultiPolygon, Polygon } from "geojson";
import area from "@turf/area";
import difference from "@turf/difference";
import { lineString } from "@turf/helpers";
import union from "@turf/union";
import { geodesicLineBuffer } from "../domain/geodesicLineBuffer";
import type { GameArea } from "../domain/annotations";
import {
  featureToGameArea,
  gameAreaToBoundingBox,
  gameAreaToPolygon,
  simplifyGameArea,
  type LatLngTuple,
} from "../domain/geometry";
import { queryOverpass } from "./overpassClient";
import {
  getOrFetchCached,
  landmassCacheKey,
} from "./geographicFeatureCache";
import {
  classifyAdminDivisionAtPoint,
  type AdminDivisionFeature,
} from "./adminDivisionBoundaries";

export const MAX_LANDMASSES = 50;
const WATERWAY_BUFFER_METERS = 2;

type OverpassGeometryNode = {
  lat: number;
  lon: number;
};

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  geometry?: OverpassGeometryNode[];
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
};

export type LandmassFeature = AdminDivisionFeature;

function wayGeometryToLineString(
  geometry: OverpassGeometryNode[] | undefined,
): Feature<LineString> | null {
  if (!geometry || geometry.length < 2) {
    return null;
  }

  return lineString(geometry.map((node) => [node.lon, node.lat]));
}

function wayGeometryToPolygon(
  geometry: OverpassGeometryNode[] | undefined,
): Feature<Polygon> | null {
  if (!geometry || geometry.length < 3) {
    return null;
  }

  const ring = geometry.map((node) => [node.lon, node.lat] as [number, number]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push(first);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [ring],
    },
  };
}

function polygonFeatureToGameArea(
  feature: Feature<Polygon | MultiPolygon>,
): GameArea {
  return featureToGameArea(feature);
}

function representativePointForBoundary(boundary: GameArea): LatLngTuple {
  const feature = gameAreaToPolygon(boundary);
  const coordinates =
    feature.geometry.type === "Polygon"
      ? feature.geometry.coordinates[0]
      : feature.geometry.coordinates[0]?.[0];

  if (!coordinates || coordinates.length === 0) {
    return [0, 0];
  }

  let latSum = 0;
  let lngSum = 0;
  let count = 0;

  for (const [lng, lat] of coordinates) {
    latSum += lat;
    lngSum += lng;
    count += 1;
  }

  return [latSum / count, lngSum / count];
}

function unionObstacles(
  obstacles: Feature<Polygon | MultiPolygon>[],
): Feature<Polygon | MultiPolygon> | null {
  let merged: Feature<Polygon | MultiPolygon> | null = null;

  for (const obstacle of obstacles) {
    if (!merged) {
      merged = obstacle;
      continue;
    }

    const next = union({
      type: "FeatureCollection",
      features: [merged, obstacle],
    });

    if (
      next &&
      (next.geometry.type === "Polygon" ||
        next.geometry.type === "MultiPolygon")
    ) {
      merged = next as Feature<Polygon | MultiPolygon>;
    }
  }

  return merged;
}

export function obstacleFeaturesFromElements(
  elements: OverpassElement[],
): Feature<Polygon | MultiPolygon>[] {
  const obstacles: Feature<Polygon | MultiPolygon>[] = [];

  for (const element of elements) {
    if (element.type !== "way" || !element.geometry) {
      continue;
    }

    const tags = element.tags ?? {};
    if (tags.natural === "water" || tags.water) {
      const polygon = wayGeometryToPolygon(element.geometry);
      if (polygon) {
        obstacles.push(polygon);
      }
      continue;
    }

    if (tags.waterway) {
      const line = wayGeometryToLineString(element.geometry);
      if (!line) {
        continue;
      }

      const buffered = geodesicLineBuffer(line, WATERWAY_BUFFER_METERS);

      if (buffered) {
        obstacles.push(buffered);
      }
    }
  }

  return obstacles;
}

function landmassPolygonsFromRemaining(
  remaining: Feature<Polygon | MultiPolygon>,
): Feature<Polygon>[] {
  if (remaining.geometry.type === "Polygon") {
    return [remaining as Feature<Polygon>];
  }

  return remaining.geometry.coordinates.map((polygonCoordinates) => ({
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: polygonCoordinates,
    },
  }));
}

function namedIslandLabels(elements: OverpassElement[]): Map<string, string> {
  const labels = new Map<string, string>();

  for (const element of elements) {
    if (element.type !== "relation" && element.type !== "way") {
      continue;
    }

    const place = element.tags?.place;
    if (place !== "island" && place !== "islet") {
      continue;
    }

    const name = element.tags?.name?.trim();
    if (!name) {
      continue;
    }

    const lat = element.lat ?? element.center?.lat;
    const lng = element.lon ?? element.center?.lon;
    if (lat === undefined || lng === undefined) {
      continue;
    }

    labels.set(`${lat.toFixed(5)}:${lng.toFixed(5)}`, name);
  }

  return labels;
}

function labelForLandmass(
  boundary: GameArea,
  islandLabels: Map<string, string>,
  fallbackIndex: number,
  isLargest: boolean,
): string {
  const point = representativePointForBoundary(boundary);
  const key = `${point[0].toFixed(5)}:${point[1].toFixed(5)}`;
  const named = islandLabels.get(key);
  if (named) {
    return named;
  }

  if (isLargest) {
    return "Mainland";
  }

  return `Landmass ${fallbackIndex}`;
}

export function computeLandmassFeatures(
  gameArea: GameArea,
  elements: OverpassElement[],
): LandmassFeature[] {
  const gameFeature = gameAreaToPolygon(gameArea);
  const obstacles = obstacleFeaturesFromElements(elements);
  const islandLabels = namedIslandLabels(elements);

  let remaining: Feature<Polygon | MultiPolygon> | null = gameFeature;

  if (obstacles.length > 0) {
    const mergedObstacles = unionObstacles(obstacles);
    if (mergedObstacles) {
      remaining = difference({
        type: "FeatureCollection",
        features: [gameFeature, mergedObstacles],
      }) as Feature<Polygon | MultiPolygon> | null;
    }
  }

  if (
    !remaining ||
    (remaining.geometry.type !== "Polygon" &&
      remaining.geometry.type !== "MultiPolygon")
  ) {
    const boundary = simplifyGameArea(gameArea);
    return [
      {
        id: "landmass:1",
        name: "Mainland",
        adminLevel: 0,
        boundary,
        representativePoint: representativePointForBoundary(boundary),
      },
    ];
  }

  const polygons = landmassPolygonsFromRemaining(remaining)
    .map((polygon) => ({
      polygon,
      boundary: simplifyGameArea(polygonFeatureToGameArea(polygon)),
    }))
    .sort(
      (left, right) =>
        area(gameAreaToPolygon(right.boundary)) -
        area(gameAreaToPolygon(left.boundary)),
    )
    .slice(0, MAX_LANDMASSES);

  return polygons.map(({ boundary }, index) => ({
    id: `landmass:${index + 1}`,
    name: labelForLandmass(boundary, islandLabels, index + 1, index === 0),
    adminLevel: 0,
    boundary,
    representativePoint: representativePointForBoundary(boundary),
  }));
}

export function buildLandmassQuery(gameArea: GameArea): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);

  return `
    [out:json][timeout:45][bbox:${south},${west},${north},${east}];
    area.searchArea;
    (
      way(area.searchArea)["natural"="water"];
      way(area.searchArea)["waterway"~"^(river|canal|stream|ditch|dock)$"];
      relation(area.searchArea)["place"~"^(island|islet)$"]["name"];
    );
    out center;
    >;
    out geom qt;
  `;
}

export async function fetchLandmassFeaturesInArea(
  gameArea: GameArea,
): Promise<LandmassFeature[]> {
  return getOrFetchCached(landmassCacheKey(gameArea), async () => {
    const payload = await queryOverpass<{ elements: OverpassElement[] }>(
      buildLandmassQuery(gameArea),
    );

    return computeLandmassFeatures(gameArea, payload.elements);
  });
}

export function classifyLandmassAtPoint(
  point: LatLngTuple,
  landmasses: LandmassFeature[],
): LandmassFeature | null {
  return classifyAdminDivisionAtPoint(point, landmasses);
}

export function landmassToMatchingFeature(landmass: LandmassFeature): {
  id: string;
  name: string;
  point: LatLngTuple;
  boundary: GameArea;
} {
  return {
    id: landmass.id,
    name: landmass.name,
    point: landmass.representativePoint,
    boundary: landmass.boundary,
  };
}
