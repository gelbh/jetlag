import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { parsePointGeometry } from "../../geometry/gameArea/geometryParsing";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { NEAR_RADAR_EDGE_METERS, radarCircumferenceGapMeters } from "./nearRadarEliminationEdge";
import {
  type HiderTruthResult,
  resultFromReplyId,
  truthUnavailable,
  UNAVAILABLE_RADAR_EDGE_GAP,
} from "./shared";

export function truthRadar(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const seekerPoint = parsePointGeometry(pending.placement.geometryJson);
  const radiusMeters = pending.placement.metadata.radiusMeters;
  if (!seekerPoint || typeof radiusMeters !== "number") {
    return truthUnavailable();
  }

  const gapMeters = radarCircumferenceGapMeters(stationCenter, seekerPoint, radiusMeters);
  if (gapMeters <= NEAR_RADAR_EDGE_METERS) {
    return truthUnavailable(UNAVAILABLE_RADAR_EDGE_GAP);
  }

  const distanceMeters = distanceBetweenPoints(stationCenter, seekerPoint);
  const replyId = distanceMeters <= radiusMeters ? "yes" : "no";
  return resultFromReplyId(pending, replyId);
}
