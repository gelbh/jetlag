import { fetchElevations } from "@/services/geo/elevation";
import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import {
  nearestPointToCoastlines,
  prepareMeasuringLineSegments,
} from "../../geometry/measuring/geometryMeasuring";
import type { MeasuringRegionInput } from "../../geometry/measuring/measuringRegions";
import { isActive } from "../../map/annotationActive";
import type { AnnotationRecord, GameArea } from "../../map/annotations";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { measuringPlacesFromMetadata } from "../measuringPlacesFromMetadata";
import { isMeasuringLinearLocation } from "../measuringQuestions";
import {
  NEAR_ELIMINATION_EDGE_METERS,
  radarCircumferenceGapMeters,
} from "./nearRadarEliminationEdge";
import {
  type HiderTruthResult,
  minDistanceToPlaces,
  resultFromReplyId,
  seekerAnchorFromMetadata,
  truthUnavailable,
  UNAVAILABLE_MEASURING_EDGE_GAP,
} from "./shared";

/** Absolute difference of two scalar distances to the same target/locus. */
export function measuringDistanceFlipGapMeters(
  stationDistanceMeters: number,
  seekerDistanceMeters: number,
): number {
  return Math.abs(stationDistanceMeters - seekerDistanceMeters);
}

function closerFurtherOrUnavailable(
  pending: PendingQuestionRecord,
  stationDistanceMeters: number,
  seekerDistanceMeters: number,
): HiderTruthResult {
  if (
    measuringDistanceFlipGapMeters(stationDistanceMeters, seekerDistanceMeters) <=
    NEAR_ELIMINATION_EDGE_METERS
  ) {
    return truthUnavailable(UNAVAILABLE_MEASURING_EDGE_GAP);
  }
  const replyId = stationDistanceMeters < seekerDistanceMeters ? "closer" : "further";
  return resultFromReplyId(pending, replyId);
}

function resolvedMeasuringGameArea(
  sessionGameArea: GameArea | undefined,
  embedded: GameArea | undefined,
): GameArea | undefined {
  if (sessionGameArea?.coordinates[0]?.length) {
    return sessionGameArea;
  }
  if (embedded?.coordinates[0]?.length) {
    return embedded;
  }
  return undefined;
}

type ParsedMeasuringRegion = Omit<MeasuringRegionInput, "measuringAnswer" | "gameArea"> & {
  gameArea?: MeasuringRegionInput["gameArea"];
};

function parseMeasuringRegionInput(regionInputJson: string): ParsedMeasuringRegion | null {
  try {
    return JSON.parse(regionInputJson) as ParsedMeasuringRegion;
  } catch {
    return null;
  }
}

/**
 * Flip gap (metres) for an answered measuring annotation at `point`, or null when
 * the annotation is not an in-scope answered measuring edge (or metadata is incomplete).
 */
export function measuringFlipGapMetersAtPoint(
  point: LatLngTuple,
  annotation: AnnotationRecord,
  sessionGameArea?: GameArea,
): number | null {
  if (!isActive(annotation) || annotation.type !== "measuring") {
    return null;
  }
  if (!annotation.metadata.measuringAnswer) {
    return null;
  }

  const regionInputJson = annotation.metadata.measuringRegionInputJson;
  if (typeof regionInputJson !== "string") {
    return null;
  }

  const regionInput = parseMeasuringRegionInput(regionInputJson);
  if (!regionInput) {
    return null;
  }

  const seekerAnchor = seekerAnchorFromMetadata(annotation.metadata);
  if (!seekerAnchor) {
    return null;
  }

  const { measuringSubject, measuringLocationCategory } = regionInput;
  if (measuringSubject === "sea_level") {
    return null;
  }

  if (
    measuringSubject === "coastline" ||
    isMeasuringLinearLocation(measuringSubject, measuringLocationCategory ?? undefined)
  ) {
    const effectiveGameArea = resolvedMeasuringGameArea(sessionGameArea, regionInput.gameArea);
    if (!effectiveGameArea) {
      return null;
    }
    const prepared = prepareMeasuringLineSegments(
      regionInput.measuringCoastSegments,
      effectiveGameArea,
    );
    const coastNearestStation = nearestPointToCoastlines(point, prepared.segments, prepared);
    const coastNearestSeeker = nearestPointToCoastlines(seekerAnchor, prepared.segments, prepared);
    if (!coastNearestStation || !coastNearestSeeker) {
      return null;
    }
    return measuringDistanceFlipGapMeters(
      coastNearestStation.distanceMeters,
      coastNearestSeeker.distanceMeters,
    );
  }

  if (regionInput.usesAllPlacesInArea) {
    const measuringPlaces = measuringPlacesFromMetadata(
      annotation.metadata,
      regionInput.measuringPlaces,
    );
    const stationDistance = minDistanceToPlaces(point, measuringPlaces);
    const seekerDistance = minDistanceToPlaces(seekerAnchor, measuringPlaces);
    if (stationDistance === null || seekerDistance === null) {
      return null;
    }
    return measuringDistanceFlipGapMeters(stationDistance, seekerDistance);
  }

  const targetPoint = regionInput.measuringTargetPoint;
  if (!targetPoint) {
    return null;
  }
  const seekerDistance = distanceBetweenPoints(seekerAnchor, targetPoint);
  return radarCircumferenceGapMeters(point, targetPoint, seekerDistance);
}

export function isNearMeasuringEliminationEdge(
  point: LatLngTuple,
  annotations: readonly AnnotationRecord[],
  thresholdMeters: number = NEAR_ELIMINATION_EDGE_METERS,
  sessionGameArea?: GameArea,
): boolean {
  for (const annotation of annotations) {
    const gap = measuringFlipGapMetersAtPoint(point, annotation, sessionGameArea);
    if (gap !== null && gap <= thresholdMeters) {
      return true;
    }
  }
  return false;
}

export function truthMeasuringSync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
  gameArea?: GameArea,
): HiderTruthResult | null {
  const metadata = pending.placement.metadata;
  const regionInputJson = metadata.measuringRegionInputJson;
  if (typeof regionInputJson !== "string") {
    return truthUnavailable();
  }

  const regionInput = parseMeasuringRegionInput(regionInputJson);
  if (!regionInput) {
    return truthUnavailable();
  }

  const seekerAnchor = seekerAnchorFromMetadata(metadata);
  if (!seekerAnchor) {
    return truthUnavailable();
  }

  const { measuringSubject, measuringLocationCategory } = regionInput;

  if (measuringSubject === "sea_level") {
    return null;
  }

  if (
    measuringSubject === "coastline" ||
    isMeasuringLinearLocation(measuringSubject, measuringLocationCategory ?? undefined)
  ) {
    const effectiveGameArea = resolvedMeasuringGameArea(gameArea, regionInput.gameArea);
    if (!effectiveGameArea) {
      return truthUnavailable();
    }

    const prepared = prepareMeasuringLineSegments(
      regionInput.measuringCoastSegments,
      effectiveGameArea,
    );
    const coastNearestStation = nearestPointToCoastlines(
      stationCenter,
      prepared.segments,
      prepared,
    );
    const coastNearestSeeker = nearestPointToCoastlines(seekerAnchor, prepared.segments, prepared);

    if (!coastNearestStation || !coastNearestSeeker) {
      return truthUnavailable();
    }

    return closerFurtherOrUnavailable(
      pending,
      coastNearestStation.distanceMeters,
      coastNearestSeeker.distanceMeters,
    );
  }

  if (regionInput.usesAllPlacesInArea) {
    const measuringPlaces = measuringPlacesFromMetadata(metadata, regionInput.measuringPlaces);
    const stationDistance = minDistanceToPlaces(stationCenter, measuringPlaces);
    const seekerDistance = minDistanceToPlaces(seekerAnchor, measuringPlaces);

    if (stationDistance === null || seekerDistance === null) {
      return truthUnavailable();
    }

    return closerFurtherOrUnavailable(pending, stationDistance, seekerDistance);
  }

  const targetPoint = regionInput.measuringTargetPoint;
  if (!targetPoint) {
    return truthUnavailable();
  }

  const stationDistance = distanceBetweenPoints(stationCenter, targetPoint);
  const seekerDistance = distanceBetweenPoints(seekerAnchor, targetPoint);
  return closerFurtherOrUnavailable(pending, stationDistance, seekerDistance);
}

export async function truthMeasuringSeaLevel(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): Promise<HiderTruthResult | null> {
  const metadata = pending.placement.metadata;
  const seekerAnchor = seekerAnchorFromMetadata(metadata);
  const seekerAltitude = metadata.measuringAnchorAltitudeMeters;

  if (!seekerAnchor || typeof seekerAltitude !== "number") {
    return truthUnavailable();
  }

  try {
    const [stationAltitude] = await fetchElevations([stationCenter]);
    if (stationAltitude === undefined || !Number.isFinite(stationAltitude)) {
      return truthUnavailable();
    }

    const replyId = stationAltitude < seekerAltitude ? "closer" : "further";
    return resultFromReplyId(pending, replyId);
  } catch {
    return truthUnavailable();
  }
}
