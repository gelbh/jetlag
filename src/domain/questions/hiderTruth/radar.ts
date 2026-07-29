import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { parsePointGeometry } from "../../geometry/gameArea/geometryParsing";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import {
  resultFromReplyId,
  truthUnavailable,
  type HiderTruthResult,
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

  const distanceMeters = distanceBetweenPoints(stationCenter, seekerPoint);
  const replyId = distanceMeters <= radiusMeters ? "yes" : "no";
  return resultFromReplyId(pending, replyId);
}
