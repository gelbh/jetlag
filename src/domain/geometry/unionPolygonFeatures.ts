import union from "@turf/union";
import bbox from "@turf/bbox";
import { featureCollection } from "@turf/helpers";
import { union as martinezUnion, type Geometry } from "martinez-polygon-clipping";
import { CircleUnion } from "circle-union";
import RBush from "rbush";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { LatLngTuple } from "./core/types";

export type PolygonFeature = Feature<GeoPolygon | MultiPolygon>;

export interface DiskSpec {
  center: LatLngTuple;
  radiusMeters: number;
}

export interface EliminationUnionInput {
  polygons: PolygonFeature[];
  disks: DiskSpec[];
}

const RBUSH_BATCH_THRESHOLD = 10;

let loggedMartinezFallback = false;

function logMartinezFallbackOnce(): void {
  if (loggedMartinezFallback) {
    return;
  }

  loggedMartinezFallback = true;
  if (import.meta.env?.DEV) {
    console.warn("[unionPolygonFeatures] martinez union failed; using turf fallback");
  }
}

function isPolygonFeature(
  feature: Feature | null | undefined,
): feature is PolygonFeature {
  return (
    feature !== null &&
    feature !== undefined &&
    (feature.geometry.type === "Polygon" ||
      feature.geometry.type === "MultiPolygon")
  );
}

function featureToMartinezGeometry(feature: PolygonFeature): Geometry {
  if (feature.geometry.type === "Polygon") {
    return feature.geometry.coordinates as Geometry;
  }

  return feature.geometry.coordinates as Geometry;
}

function martinezGeometryToFeature(geometry: Geometry): PolygonFeature | null {
  if (!Array.isArray(geometry) || geometry.length === 0) {
    return null;
  }

  if (geometry.length === 1) {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: geometry[0] as GeoPolygon["coordinates"],
      },
    };
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "MultiPolygon",
      coordinates: geometry as MultiPolygon["coordinates"],
    },
  };
}

function unionPairTurf(
  left: PolygonFeature,
  right: PolygonFeature,
): PolygonFeature | null {
  try {
    const merged = union(featureCollection([left, right]));
    return isPolygonFeature(merged) ? merged : null;
  } catch {
    return null;
  }
}

function unionPairMartinez(
  left: PolygonFeature,
  right: PolygonFeature,
): PolygonFeature | null {
  try {
    const merged = martinezUnion(
      featureToMartinezGeometry(left),
      featureToMartinezGeometry(right),
    );
    if (!merged || merged.length === 0) {
      return unionPairTurf(left, right);
    }

    return martinezGeometryToFeature(merged) ?? unionPairTurf(left, right);
  } catch {
    logMartinezFallbackOnce();
    return unionPairTurf(left, right);
  }
}

function unionPair(
  left: PolygonFeature,
  right: PolygonFeature,
  engine: "martinez" | "turf",
): PolygonFeature | null {
  if (engine === "turf") {
    return unionPairTurf(left, right);
  }

  return unionPairMartinez(left, right);
}

interface FeatureBboxItem {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  index: number;
}

function spatiallyOrderFeatures(features: PolygonFeature[]): PolygonFeature[] {
  if (features.length < RBUSH_BATCH_THRESHOLD) {
    return [...features];
  }

  const tree = new RBush<FeatureBboxItem>();
  const items: FeatureBboxItem[] = features.map((feature, index) => {
    const [west, south, east, north] = bbox(feature);
    return { minX: west, minY: south, maxX: east, maxY: north, index };
  });

  tree.load(items);

  const visited = new Set<number>();
  const ordered: PolygonFeature[] = [];

  for (let seed = 0; seed < features.length; seed += 1) {
    if (visited.has(seed)) {
      continue;
    }

    const queue = [seed];
    visited.add(seed);

    while (queue.length > 0) {
      const currentIndex = queue.shift();
      if (currentIndex === undefined) {
        continue;
      }

      ordered.push(features[currentIndex]!);
      const [west, south, east, north] = bbox(features[currentIndex]!);
      const neighbors = tree.search({
        minX: west,
        minY: south,
        maxX: east,
        maxY: north,
      });

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.index)) {
          continue;
        }

        visited.add(neighbor.index);
        queue.push(neighbor.index);
      }
    }
  }

  return ordered.length === features.length ? ordered : [...features];
}

function divideAndConquerUnion(
  features: readonly PolygonFeature[],
  engine: "martinez" | "turf",
): PolygonFeature | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0] ?? null;
  }

  let layer = spatiallyOrderFeatures(
    features.filter((feature): feature is PolygonFeature => feature != null),
  );

  while (layer.length > 1) {
    const next: PolygonFeature[] = [];

    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index];
      const right = layer[index + 1];

      if (!left) {
        continue;
      }

      if (!right) {
        next.push(left);
        continue;
      }

      const merged = unionPair(left, right, engine);
      next.push(merged ?? left);
    }

    layer = next;
  }

  return layer[0] ?? null;
}

/** Turf-only divide-and-conquer union for parity baselines in tests. */
export function unionPolygonFeaturesLegacy(
  features: readonly PolygonFeature[],
): PolygonFeature | null {
  return divideAndConquerUnion(features, "turf");
}

export function unionDiskSpecs(disks: readonly DiskSpec[]): PolygonFeature | null {
  if (disks.length === 0) {
    return null;
  }

  if (disks.length === 1) {
    const disk = disks[0];
    if (!disk) {
      return null;
    }

    const circleUnion = new CircleUnion(1);
    circleUnion.add(disk.center[1], disk.center[0], disk.radiusMeters / 1000);
    const geometry = circleUnion.geojson();
    return {
      type: "Feature",
      properties: {},
      geometry,
    };
  }

  const circleUnion = new CircleUnion(disks.length);
  for (const disk of disks) {
    circleUnion.add(disk.center[1], disk.center[0], disk.radiusMeters / 1000);
  }

  const geometry = circleUnion.geojson();
  return {
    type: "Feature",
    properties: {},
    geometry,
  };
}

function mergeUnionResults(
  left: PolygonFeature | null,
  right: PolygonFeature | null,
  engine: "martinez" | "turf",
): PolygonFeature | null {
  if (!left) {
    return right;
  }

  if (!right) {
    return left;
  }

  return unionPair(left, right, engine) ?? left;
}

/** Unions polygon features using martinez with turf fallback. */
export function unionPolygonFeatures(
  features: readonly PolygonFeature[],
): PolygonFeature | null {
  return divideAndConquerUnion(features, "martinez");
}

export function unionEliminationParts(
  input: EliminationUnionInput,
  engine: "martinez" | "turf" = "martinez",
): PolygonFeature | null {
  const polyResult = divideAndConquerUnion(input.polygons, engine);
  const diskResult = unionDiskSpecs(input.disks);
  return mergeUnionResults(diskResult, polyResult, engine);
}

export function unionEliminationPartsLegacy(
  input: EliminationUnionInput,
): PolygonFeature | null {
  return unionEliminationParts(input, "turf");
}
