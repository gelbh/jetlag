import difference from "@turf/difference";
import turfCircle from "@turf/circle";
import { featureCollection, point as turfPoint } from "@turf/helpers";
import type { AnnotationRecord, GameArea } from "../map/annotations";
import { isActive } from "../map/annotations";
import type { HidingZoneRecord } from "../session/hidingZone";
import { buildHidingZoneCircle } from "../session/hidingZone";
import {
  buildHalfPlanePolygon,
  buildRadarShadedRegion,
  type LatLngTuple,
} from "./geometry";
import { gameAreaFingerprint } from "./core/gameAreaConvert";
import { DEFAULT_RADIUS_METERS } from "../map/distance";
import { MAP_ANNOTATION_COLORS } from "../map/mapAnnotationColors";
import { thermometerShadedSide } from "../questions/thermometerQuestions";
import {
  unionPolygonFeatures,
  type PolygonFeature,
} from "./unionPolygonFeatures";
import union from "@turf/union";

export const ELIMINATION_FILL_COLOR = MAP_ANNOTATION_COLORS.elimination;

const eliminationFeatureCache = new Map<
  string,
  { gameAreaKey: string; fingerprint: string; feature: PolygonFeature | null }
>();

interface EliminationMaskCache {
  gameAreaKey: string;
  committedKey: string;
  draftKey: string;
  endGameKey: string;
  mask: PolygonFeature | null;
}

let eliminationMaskCache: EliminationMaskCache | null = null;

export function gameAreaCacheKey(gameArea: GameArea): string {
  return gameAreaFingerprint(gameArea);
}

function annotationEliminationFingerprint(
  annotation: AnnotationRecord,
): string {
  return [
    annotation.status,
    annotation.updatedAt ?? "",
    annotation.type,
    JSON.stringify(annotation.metadata),
    JSON.stringify(annotation.geometry),
  ].join("|");
}

function draftFeaturesCacheKey(
  draftFeatures: readonly PolygonFeature[],
): string {
  if (draftFeatures.length === 0) {
    return "";
  }

  return draftFeatures
    .map((feature) => JSON.stringify(feature.geometry))
    .join("||");
}

function endGameZonesCacheKey(
  hidingZones: readonly HidingZoneRecord[],
): string {
  if (hidingZones.length === 0) {
    return "";
  }

  return hidingZones
    .map(
      (zone) =>
        `${zone.stationId}:${zone.center.lat}:${zone.center.lng}:${zone.radiusMeters}`,
    )
    .sort()
    .join("|");
}

export function clearCombinedEliminationMaskCacheForTests(): void {
  eliminationFeatureCache.clear();
  eliminationMaskCache = null;
}

export function eliminationFeatureForAnnotation(
  annotation: AnnotationRecord,
  gameArea: GameArea,
): PolygonFeature | null {
  const gameAreaKey = gameAreaCacheKey(gameArea);
  const fingerprint = annotationEliminationFingerprint(annotation);
  const cacheKey = annotation.id;
  const cached = eliminationFeatureCache.get(cacheKey);

  if (
    cached &&
    cached.gameAreaKey === gameAreaKey &&
    cached.fingerprint === fingerprint
  ) {
    return cached.feature;
  }

  const feature = computeEliminationFeatureForAnnotation(annotation, gameArea);
  eliminationFeatureCache.set(cacheKey, {
    gameAreaKey,
    fingerprint,
    feature,
  });
  return feature;
}

function computeEliminationFeatureForAnnotation(
  annotation: AnnotationRecord,
  gameArea: GameArea,
): PolygonFeature | null {
  if (!isActive(annotation)) {
    return null;
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

      return turfCircle(
        turfPoint([center[1], center[0]]),
        searchRadiusMeters / 1000,
        { steps: 64, units: "kilometers" },
      ) as PolygonFeature;
    }

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

export function unionEliminationFeatures(
  features: readonly PolygonFeature[],
): PolygonFeature | null {
  return unionPolygonFeatures(features);
}

function collectCommittedEliminationFeatures(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
): PolygonFeature[] {
  const committed: PolygonFeature[] = [];

  for (const annotation of annotations) {
    const feature = eliminationFeatureForAnnotation(annotation, gameArea);
    if (feature) {
      committed.push(feature);
    }
  }

  return committed;
}

function committedAnnotationsKey(
  annotations: readonly AnnotationRecord[],
): string {
  return annotations
    .filter(isActive)
    .map(
      (annotation) =>
        `${annotation.id}:${annotationEliminationFingerprint(annotation)}`,
    )
    .sort()
    .join("|");
}

function tryIncrementalMaskAdd(
  previous: EliminationMaskCache,
  gameAreaKey: string,
  committedKey: string,
  draftKey: string,
  newFeature: PolygonFeature,
): PolygonFeature | null {
  if (
    previous.gameAreaKey !== gameAreaKey ||
    previous.draftKey !== draftKey ||
    previous.endGameKey !== "" ||
    !previous.mask
  ) {
    return null;
  }

  const previousIds = new Set(
    previous.committedKey.split("|").map((entry) => entry.split(":")[0]),
  );
  const currentIds = committedKey
    .split("|")
    .filter(Boolean)
    .map((entry) => entry.split(":")[0]);

  if (currentIds.length !== previousIds.size + 1) {
    return null;
  }

  const addedId = currentIds.find((id) => !previousIds.has(id));
  if (!addedId) {
    return null;
  }

  const merged = union(featureCollection([previous.mask, newFeature]));
  if (
    merged &&
    (merged.geometry.type === "Polygon" ||
      merged.geometry.type === "MultiPolygon")
  ) {
    return merged as PolygonFeature;
  }

  return null;
}

export function buildCombinedEliminationMask(
  annotations: readonly AnnotationRecord[],
  gameArea: GameArea,
  draftFeatures: readonly PolygonFeature[] = [],
  endGameHidingZones: readonly HidingZoneRecord[] = [],
): PolygonFeature | null {
  const gameAreaKey = gameAreaCacheKey(gameArea);
  const endGameKey = endGameZonesCacheKey(endGameHidingZones);

  if (endGameHidingZones.length > 0) {
    const mask = buildEndGameEliminationMask(gameArea, endGameHidingZones);
    eliminationMaskCache = {
      gameAreaKey,
      committedKey: "",
      draftKey: "",
      endGameKey,
      mask,
    };
    return mask;
  }

  const committedKey = committedAnnotationsKey(annotations);
  const draftKey = draftFeaturesCacheKey(draftFeatures);

  if (
    eliminationMaskCache &&
    eliminationMaskCache.gameAreaKey === gameAreaKey &&
    eliminationMaskCache.committedKey === committedKey &&
    eliminationMaskCache.draftKey === draftKey &&
    eliminationMaskCache.endGameKey === endGameKey
  ) {
    return eliminationMaskCache.mask;
  }

  const committed = collectCommittedEliminationFeatures(annotations, gameArea);
  const allFeatures = [...committed, ...draftFeatures];

  let mask: PolygonFeature | null = null;

  if (
    eliminationMaskCache &&
    draftFeatures.length === 0 &&
    committed.length > 0 &&
    committed.length === committedKey.split("|").filter(Boolean).length
  ) {
    const lastCommitted = committed[committed.length - 1];
    if (lastCommitted) {
      mask = tryIncrementalMaskAdd(
        eliminationMaskCache,
        gameAreaKey,
        committedKey,
        draftKey,
        lastCommitted,
      );
    }
  }

  if (!mask) {
    mask = unionEliminationFeatures(allFeatures);
  }

  eliminationMaskCache = {
    gameAreaKey,
    committedKey,
    draftKey,
    endGameKey,
    mask,
  };

  return mask;
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

  const zoneFeatures = hidingZones.map((zone) =>
    buildHidingZoneCircle([zone.center.lat, zone.center.lng], zone.radiusMeters),
  );

  const revealedZones = unionEliminationFeatures(zoneFeatures);
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
  return (
    pulsingIds.has(annotation.id) &&
    eliminationFeatureForAnnotation(annotation, gameArea) !== null
  );
}
