import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/geometry";
import { parsePointGeometry } from "../../geometry/geometryParsing";
import type { PendingQuestionRecord } from "../../session/sessionChat";
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
