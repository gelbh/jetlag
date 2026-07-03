import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type {
  Feature,
  MultiPolygon,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "./annotations";
import { isActive } from "./annotations";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
  type LatLngTuple,
} from "./geometry";
import { DEFAULT_RADIUS_METERS } from "./distance";
import { MAP_ANNOTATION_COLORS } from "./mapAnnotationColors";
import { thermometerShadedSide } from "./thermometerQuestions";

export const ELIMINATION_FILL_COLOR = MAP_ANNOTATION_COLORS.elimination;

export function eliminationFeatureForAnnotation(
  annotation: AnnotationRecord,
  gameArea: GameArea,
): Feature<GeoPolygon | MultiPolygon> | null {
  if (!isActive(annotation)) {
    return null;
  }

  if (annotation.type === "matching") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      return annotation.geometry as Feature<GeoPolygon | MultiPolygon>;
    }
    return null;
  }

  if (annotation.type === "measuring") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      return annotation.geometry as Feature<GeoPolygon | MultiPolygon>;
    }
    return null;
  }

  if (
    annotation.type === "thermometer" &&
    annotation.geometry.geometry.type === "LineString" &&
    annotation.metadata.thermometerAnswer
  ) {
    const coordinates = annotation.geometry.geometry.coordinates;
    const thermoA: LatLngTuple = [coordinates[0][1], coordinates[0][0]];
    const thermoB: LatLngTuple = [
      coordinates[coordinates.length - 1][1],
      coordinates[coordinates.length - 1][0],
    ];

    return buildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      thermometerShadedSide(annotation.metadata.thermometerAnswer),
    );
  }

  if (
    annotation.type === "tentacle" &&
    annotation.metadata.tentacleEliminationJson
  ) {
    try {
      return JSON.parse(
        annotation.metadata.tentacleEliminationJson,
      ) as Feature<GeoPolygon | MultiPolygon>;
    } catch {
      return null;
    }
  }

  if (annotation.type === "radar") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type !== "Point") {
      return null;
    }

    const center: LatLngTuple = [geometry.coordinates[1], geometry.coordinates[0]];
    const radiusMeters = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const shadedInside = annotation.metadata.inside === true;

    return buildRadarShadedRegion(
      center,
      radiusMeters,
      gameArea,
      shadedInside,
    );
  }

  if (
    annotation.type === "zone" &&
    (annotation.geometry.geometry.type === "Polygon" ||
      annotation.geometry.geometry.type === "MultiPolygon")
  ) {
    return annotation.geometry as Feature<GeoPolygon | MultiPolygon>;
  }

  return null;
}

export function unionEliminationFeatures(
  features: readonly Feature<GeoPolygon | MultiPolygon>[],
): Feature<GeoPolygon | MultiPolygon> | null {
  if (features.length === 0) {
    return null;
  }

  if (features.length === 1) {
    return features[0] ?? null;
  }

  let combined = features[0] ?? null;
  if (!combined) {
    return null;
  }

  for (let index = 1; index < features.length; index += 1) {
    const next = features[index];
    if (!next) {
      continue;
    }

    const merged = union(featureCollection([combined, next]));
    if (
      merged &&
      (merged.geometry.type === "Polygon" ||
        merged.geometry.type === "MultiPolygon")
    ) {
      combined = merged as Feature<GeoPolygon | MultiPolygon>;
    }
  }

  return combined;
}

export function buildCombinedEliminationMask(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly Feature<GeoPolygon | MultiPolygon>[] = [],
): Feature<GeoPolygon | MultiPolygon> | null {
  const committed = annotations
    .map((annotation) => eliminationFeatureForAnnotation(annotation, gameArea))
    .filter(
      (feature): feature is Feature<GeoPolygon | MultiPolygon> =>
        feature !== null,
    );

  return unionEliminationFeatures([...committed, ...draftFeatures]);
}
