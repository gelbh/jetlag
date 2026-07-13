import difference from "@turf/difference";
import turfCircle from "@turf/circle";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import { isActive } from "../map/annotationActive";
import type { HidingZoneRecord } from "../session/hidingZone";
import type { LatLngTuple } from "./core/types";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
} from "./core/radarHalfPlane";
import { DEFAULT_RADIUS_METERS } from "../map/distance";
import { MAP_ANNOTATION_COLORS } from "../map/mapAnnotationColors";
import { thermometerShadedSide } from "../questions/thermometerQuestions";
import {
  unionDiskSpecs,
  unionEliminationParts,
  type DiskSpec,
  type EliminationUnionInput,
  type PolygonFeature,
} from "./unionPolygonFeatures";

export const ELIMINATION_FILL_COLOR = MAP_ANNOTATION_COLORS.elimination;

export function eliminationDiskForAnnotation(
  annotation: AnnotationRecord,
): DiskSpec | null {
  if (!isActive(annotation)) {
    return null;
  }

  if (annotation.type === "tentacle") {
    if (
      annotation.metadata.tentacleOutOfReach === true &&
      annotation.geometry.geometry.type === "Point"
    ) {
      const coordinates = annotation.geometry.geometry.coordinates;
      const center: LatLngTuple = [coordinates[1], coordinates[0]];
      const searchRadiusMeters =
        annotation.metadata.tentacleAnswerRadiusMeters ??
        annotation.metadata.radiusMeters ??
        DEFAULT_RADIUS_METERS;

      return { center, radiusMeters: searchRadiusMeters };
    }

    return null;
  }

  if (annotation.type === "radar") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type !== "Point") {
      return null;
    }

    if (annotation.metadata.inside !== true) {
      return null;
    }

    const center: LatLngTuple = [geometry.coordinates[1], geometry.coordinates[0]];
    const radiusMeters =
      annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;

    return { center, radiusMeters };
  }

  return null;
}

export function eliminationFeatureForAnnotation(
  annotation: AnnotationRecord,
  gameArea: GameArea,
): PolygonFeature | null {
  if (!isActive(annotation)) {
    return null;
  }

  const disk = eliminationDiskForAnnotation(annotation);
  if (disk) {
    return turfCircle(
      turfPoint([disk.center[1], disk.center[0]]),
      disk.radiusMeters / 1000,
      { steps: 64, units: "kilometers" },
    ) as PolygonFeature;
  }

  if (annotation.type === "matching") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      return annotation.geometry as PolygonFeature;
    }
    return null;
  }

  if (annotation.type === "measuring") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      return annotation.geometry as PolygonFeature;
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

  if (annotation.type === "tentacle") {
    if (annotation.metadata.tentacleEliminationJson) {
      try {
        return JSON.parse(
          annotation.metadata.tentacleEliminationJson,
        ) as PolygonFeature;
      } catch {
        return null;
      }
    }

    return null;
  }

  if (annotation.type === "radar") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type !== "Point") {
      return null;
    }

    const center: LatLngTuple = [geometry.coordinates[1], geometry.coordinates[0]];
    const radiusMeters = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const shadedInside = annotation.metadata.inside === true;

    if (shadedInside) {
      return null;
    }

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
    return annotation.geometry as PolygonFeature;
  }

  return null;
}

export function computeEliminationUnionInput(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
): EliminationUnionInput {
  const polygons: PolygonFeature[] = [...draftFeatures];
  const disks: DiskSpec[] = [];

  for (const annotation of annotations) {
    const disk = eliminationDiskForAnnotation(annotation);
    if (disk) {
      disks.push(disk);
      continue;
    }

    const feature = eliminationFeatureForAnnotation(annotation, gameArea);
    if (feature) {
      polygons.push(feature);
    }
  }

  return { polygons, disks };
}

export function buildCombinedEliminationMask(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
  endGameHidingZones: readonly HidingZoneRecord[] = [],
): PolygonFeature | null {
  if (endGameHidingZones.length > 0) {
    return buildEndGameEliminationMask(gameArea, endGameHidingZones);
  }

  try {
    return unionEliminationParts(
      computeEliminationUnionInput(annotations, gameArea, draftFeatures),
    );
  } catch {
    return null;
  }
}

export function buildEndGameEliminationMask(
  gameArea: GameArea,
  hidingZones: readonly HidingZoneRecord[],
): PolygonFeature | null {
  const playArea: PolygonFeature = {
    type: "Feature",
    properties: {},
    geometry: gameArea,
  };

  const zoneDisks: DiskSpec[] = hidingZones.map((zone) => ({
    center: [zone.center.lat, zone.center.lng] as LatLngTuple,
    radiusMeters: zone.radiusMeters,
  }));

  const revealedZones = unionDiskSpecs(zoneDisks);
  if (!revealedZones) {
    return playArea;
  }

  const eliminated = difference(featureCollection([playArea, revealedZones]));
  if (
    eliminated &&
    (eliminated.geometry.type === "Polygon" ||
      eliminated.geometry.type === "MultiPolygon")
  ) {
    return eliminated as PolygonFeature;
  }

  return playArea;
}

export function annotationHasEliminationFeature(
  annotation: AnnotationRecord,
  gameArea: GameArea,
  pulsingIds: ReadonlySet<string>,
): boolean {
  if (!pulsingIds.has(annotation.id)) {
    return false;
  }

  return (
    eliminationFeatureForAnnotation(annotation, gameArea) !== null ||
    eliminationDiskForAnnotation(annotation) !== null
  );
}
