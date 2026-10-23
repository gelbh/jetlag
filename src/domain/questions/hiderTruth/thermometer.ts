import { distanceBetweenPoints, type LatLngTuple } from "../../geometry/gameArea/geometry";
import { parseLineEndpoints } from "../../geometry/gameArea/geometryParsing";
import type { PendingQuestionRecord } from "../../session/activity/sessionChat";
import { NEAR_ELIMINATION_EDGE_METERS, thermometerFlipGapMeters } from "./nearRadarEliminationEdge";
import {
  type HiderTruthResult,
  resultFromReplyId,
  truthUnavailable,
  UNAVAILABLE_THERMOMETER_EDGE_GAP,
} from "./shared";

export function truthThermometer(
  pending: PendingQuestionRecord,
  stationCenter: LatLngTuple,
): HiderTruthResult | null {
  const line = parseLineEndpoints(pending.placement.geometryJson);
  if (!line) {
    return truthUnavailable();
  }

  if (
    thermometerFlipGapMeters(stationCenter, line.start, line.end) <= NEAR_ELIMINATION_EDGE_METERS
  ) {
    return truthUnavailable(UNAVAILABLE_THERMOMETER_EDGE_GAP);
  }

  const distanceToStart = distanceBetweenPoints(stationCenter, line.start);
  const distanceToEnd = distanceBetweenPoints(stationCenter, line.end);
  const replyId = distanceToEnd + 1e-6 < distanceToStart ? "hotter" : "colder";
  return resultFromReplyId(pending, replyId);
}
