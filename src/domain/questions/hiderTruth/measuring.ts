import {
  distanceBetweenPoints,
  nearestPointToCoastlines,
  type LatLngTuple,
} from "../../geometry/geometry";
import type { MeasuringRegionInput } from "../../geometry/measuringRegions";
import { fetchElevations } from "../../../services/geo/elevation";
import type { PendingQuestionRecord } from "../../session/sessionChat";
import { isMeasuringLinearLocation } from "../measuringQuestions";
import {
  minDistanceToPlaces,
  resultFromReplyId,
  seekerAnchorFromMetadata,
  truthUnavailable,
  type HiderTruthResult,
} from "./shared";

export function truthMeasuringSync(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const metadata = pending.placement.metadata;
  const regionInputJson = metadata.measuringRegionInputJson;
  if (typeof regionInputJson !== "string") {
    return truthUnavailable();
  }

  let regionInput: Omit<MeasuringRegionInput, "measuringAnswer">;
  try {
    regionInput = JSON.parse(regionInputJson) as Omit<
      MeasuringRegionInput,
      "measuringAnswer"
    >;
  } catch {
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
    isMeasuringLinearLocation(
      measuringSubject,
      measuringLocationCategory ?? undefined,
    )
  ) {
    const coastNearestStation = nearestPointToCoastlines(
      stationCenter,
      regionInput.measuringCoastSegments,
    );
    const coastNearestSeeker = nearestPointToCoastlines(
      seekerAnchor,
      regionInput.measuringCoastSegments,
    );

    if (!coastNearestStation || !coastNearestSeeker) {
      return truthUnavailable();
    }

    const replyId =
      coastNearestStation.distanceMeters < coastNearestSeeker.distanceMeters
        ? "closer"
        : "further";
    return resultFromReplyId(pending, replyId);
  }

  if (regionInput.usesAllPlacesInArea) {
    const stationDistance = minDistanceToPlaces(
      stationCenter,
      regionInput.measuringPlaces,
    );
    const seekerDistance = minDistanceToPlaces(
      seekerAnchor,
      regionInput.measuringPlaces,
    );

    if (stationDistance === null || seekerDistance === null) {
      return truthUnavailable();
    }

    const replyId = stationDistance < seekerDistance ? "closer" : "further";
    return resultFromReplyId(pending, replyId);
  }

  const targetPoint = regionInput.measuringTargetPoint;
  if (!targetPoint) {
    return truthUnavailable();
  }

  const stationDistance = distanceBetweenPoints(stationCenter, targetPoint);
  const seekerDistance = distanceBetweenPoints(seekerAnchor, targetPoint);
  const replyId = stationDistance < seekerDistance ? "closer" : "further";
  return resultFromReplyId(pending, replyId);
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
