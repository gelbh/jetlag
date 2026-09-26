import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import { isActive } from "../../map/annotationActive";
import { DEFAULT_RADIUS_METERS } from "../../map/distance";
import { MAP_ANNOTATION_COLORS } from "../../map/mapAnnotationColors";
import { thermometerShadedSide } from "../../questions/thermometerQuestions";
import { measuringPlacesFromMetadata } from "../../questions/measuringPlacesFromMetadata";
import type { HidingZoneRecord } from "../../session/hiding/hidingZone";
import {
  dispatchHalfPlane,
  dispatchRadarShadedRegion,
} from "../core/radarHalfPlane";
import { resolveClientMaskKernelMode } from "../kernel";
import {
  buildMeasuringEliminationPreview,
  type MeasuringRegionInput,
} from "../measuring/measuringRegions";
import type {
  DiskSpec,
  EliminationUnionInput,
  LatLngTuple,
  PolygonFeature,
} from "../kernel/types";

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

    // metadata.inside = hider within circle (yes). Eliminate where they are not:
    // no → disk; yes → exterior (kernel path below).
    if (annotation.metadata.inside !== false) {
      return null;
    }

    const center: LatLngTuple = [geometry.coordinates[1], geometry.coordinates[0]];
    const radiusMeters =
      annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;

    return { center, radiusMeters };
  }

  return null;
}

async function measuringEliminationFromStoredMetadata(
  annotation: AnnotationRecord,
  gameArea: GameArea,
): Promise<PolygonFeature | null> {
  const answer = annotation.metadata.measuringAnswer;
  const regionInputJson = annotation.metadata.measuringRegionInputJson;
  if (!answer || typeof regionInputJson !== "string") {
    return null;
  }

  try {
    const regionInput = JSON.parse(regionInputJson) as Omit<
      MeasuringRegionInput,
      "measuringAnswer" | "gameArea"
    >;
    const feature = await buildMeasuringEliminationPreview({
      ...regionInput,
      measuringPlaces: measuringPlacesFromMetadata(
        { measuringPlacesJson: annotation.metadata.measuringPlacesJson },
        regionInput.measuringPlaces,
      ),
      measuringAnswer: answer,
      gameArea,
    });
    if (
      feature &&
      (feature.geometry.type === "Polygon" ||
        feature.geometry.type === "MultiPolygon")
    ) {
      return feature as PolygonFeature;
    }
  } catch {
    return null;
  }

  return null;
}

function eliminationFeatureFromNonKernel(
  annotation: AnnotationRecord,
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

  if (
    annotation.type === "zone" &&
    (annotation.geometry.geometry.type === "Polygon" ||
      annotation.geometry.geometry.type === "MultiPolygon")
  ) {
    return annotation.geometry as PolygonFeature;
  }

  return null;
}

/** Non-kernel sync feature only (tests / presence). Kernel paths are async. */
export function eliminationFeatureForAnnotationTs(
  annotation: AnnotationRecord,
): PolygonFeature | null {
  return eliminationFeatureFromNonKernel(annotation);
}

export async function eliminationFeatureForAnnotation(
  annotation: AnnotationRecord,
  gameArea: GameArea,
): Promise<PolygonFeature | null> {
  const nonKernel = eliminationFeatureFromNonKernel(annotation);
  if (nonKernel) {
    return nonKernel;
  }

  if (!isActive(annotation)) {
    return null;
  }

  if (annotation.type === "measuring") {
    return measuringEliminationFromStoredMetadata(annotation, gameArea);
  }

  const mode = resolveClientMaskKernelMode();

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

    return dispatchHalfPlane(
      thermoA,
      thermoB,
      gameArea,
      thermometerShadedSide(annotation.metadata.thermometerAnswer),
      "midpoint",
      mode,
    );
  }

  if (annotation.type === "radar") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type !== "Point") {
      return null;
    }

    if (typeof annotation.metadata.inside !== "boolean") {
      return null;
    }

    const center: LatLngTuple = [geometry.coordinates[1], geometry.coordinates[0]];
    const radiusMeters = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;

    // yes (inside): eliminate exterior. no: disk path in eliminationDiskForAnnotation.
    if (!annotation.metadata.inside) {
      return null;
    }

    return dispatchRadarShadedRegion(
      center,
      radiusMeters,
      gameArea,
      false,
      mode,
    );
  }

  return null;
}

/** Sync union input for tests/parity only (non-kernel polygons + disks). */
export function computeEliminationUnionInputTs(
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

    const feature = eliminationFeatureForAnnotationTs(annotation);
    if (feature) {
      polygons.push(feature);
    }
  }

  return { polygons, disks };
}

export async function computeEliminationUnionInput(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
): Promise<EliminationUnionInput> {
  const polygons: PolygonFeature[] = [...draftFeatures];
  const disks: DiskSpec[] = [];

  for (const annotation of annotations) {
    const disk = eliminationDiskForAnnotation(annotation);
    if (disk) {
      disks.push(disk);
      continue;
    }

    const feature = await eliminationFeatureForAnnotation(annotation, gameArea);
    if (feature) {
      polygons.push(feature);
    }
  }

  return { polygons, disks };
}

export function annotationsToEndGameDisks(
  hidingZones: readonly HidingZoneRecord[],
): DiskSpec[] {
  return hidingZones.map((zone) => ({
    center: [zone.center.lat, zone.center.lng],
    radiusMeters: zone.radiusMeters,
  }));
}

function annotationLikelyHasEliminationFeature(
  annotation: AnnotationRecord,
): boolean {
  if (eliminationDiskForAnnotation(annotation) !== null) {
    return true;
  }
  if (!isActive(annotation)) {
    return false;
  }

  if (annotation.type === "matching" || annotation.type === "zone") {
    const geometry = annotation.geometry.geometry;
    return geometry.type === "Polygon" || geometry.type === "MultiPolygon";
  }

  if (annotation.type === "measuring") {
    const geometry = annotation.geometry.geometry;
    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      return true;
    }
    return (
      Boolean(annotation.metadata.measuringAnswer) &&
      typeof annotation.metadata.measuringRegionInputJson === "string"
    );
  }

  if (annotation.type === "tentacle") {
    return typeof annotation.metadata.tentacleEliminationJson === "string";
  }

  if (
    annotation.type === "thermometer" &&
    annotation.geometry.geometry.type === "LineString" &&
    annotation.metadata.thermometerAnswer
  ) {
    return true;
  }

  if (
    annotation.type === "radar" &&
    annotation.geometry.geometry.type === "Point" &&
    typeof annotation.metadata.inside === "boolean"
  ) {
    return true;
  }

  return false;
}

export function annotationHasEliminationFeature(
  annotation: AnnotationRecord,
  pulsingIds: ReadonlySet<string>,
): boolean {
  if (!pulsingIds.has(annotation.id)) {
    return false;
  }

  return annotationLikelyHasEliminationFeature(annotation);
}
